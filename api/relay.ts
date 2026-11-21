import {
  Account,
  Address,
  TransactionBuilder,
  rpc,
  xdr,
  type Transaction,
} from '@stellar/stellar-sdk';
import { db } from './_lib/db.js';
import { clientIp, json, logError } from './_lib/http.js';
import { readSession } from './_lib/session.js';
import { hmacHex } from './_lib/kyc/hash.js';
import { relayConfig, type RelayConfig } from './_lib/relay/config.js';
import { checkUserTx, resourceFee } from './_lib/relay/policy.js';
import { buildActivation, checkActivation, checkRestoreFootprint, buildRestore, type ActivationNeeds } from './_lib/relay/sponsor.js';
import { checkLimits, logPending, logSettled, logLine, type RelayKind } from './_lib/relay/ledger.js';
import { submitAndWait, type SubmitOutcome } from './_lib/relay/submit.js';
import { hex } from './_lib/relay/xdrUtil.js';

// PACTA fee relayer (docs/fee-relayer.md). Users never need XLM: the wallet
// signs its own transaction, the relayer checks it against an allowlist, wraps
// it in a fee bump paid by the PACTA sponsor account, and submits it. New
// wallets are activated with sponsored reserves (0 XLM), and archived escrow
// storage is restored at the relayer's cost.
//   GET  ?action=status            public: enabled, sponsor, limits
//   POST ?action=submit            { xdr }  user-signed transaction
//   POST ?action=activate          session: build the sponsored activation
//   POST ?action=activate-submit   session: { xdr } the signed activation
//   POST ?action=restore           { transactionData }  restore escrow storage

const MAX_BODY = 64 * 1024;
const MIN_INCLUSION = 200n; // stroops per operation the relayer bids
const ACCOUNT_RESERVES = 2 * 5_000_000; // sponsored account: 2 base reserves
const TRUSTLINE_RESERVE = 5_000_000;

const HORIZON = process.env.RELAYER_HORIZON_URL || 'https://horizon-testnet.stellar.org';

function server(cfg: RelayConfig) {
  return new rpc.Server(cfg.rpcUrl);
}

function sessionWallet(req: Request): string | null {
  try {
    return readSession(req);
  } catch (e) {
    logError('relay-session', e);
    return null;
  }
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY) return null;
  const raw = await req.text();
  if (raw.length > MAX_BODY) return null;
  try {
    const b = JSON.parse(raw);
    return typeof b === 'object' && b !== null && !Array.isArray(b) ? b : null;
  } catch {
    return null;
  }
}

const XLM = (stroops: number | null | undefined) => (stroops == null ? null : stroops / 1e7);

// Reserve against the caps, submit, settle the log. One path for every kind.
async function sponsorAndSubmit(
  cfg: RelayConfig,
  p: { tx: Transaction | ReturnType<typeof TransactionBuilder.buildFeeBumpTransaction>; innerHash: string; wallet: string; ipHash: string | null; kind: RelayKind; feeMax: number; reserves?: number; contract?: string; fn?: string; ops: string[] },
): Promise<Response> {
  const supa = db();
  const limits = await checkLimits(supa, cfg, { wallet: p.wallet, ipHash: p.ipHash, feeMax: p.feeMax, reserves: p.reserves, kind: p.kind });
  if (limits.ok === false) {
    logLine('refused', { reason: limits.reason, wallet: p.wallet, kind: p.kind });
    return json({ error: limits.reason }, 429);
  }
  const id = await logPending(supa, { wallet: p.wallet, ipHash: p.ipHash, kind: p.kind, contract: p.contract, fn: p.fn, ops: p.ops, feeMax: p.feeMax, reserves: p.reserves, innerHash: p.innerHash });
  let out: SubmitOutcome;
  try {
    out = await submitAndWait(server(cfg), p.tx);
  } catch (e) {
    // Unknown whether it reached the network: keep the full reservation.
    await logSettled(supa, id, { status: 'pending', error: 'submit_error' });
    throw e;
  }
  await logSettled(supa, id, { status: out.status, hash: out.hash, feeCharged: out.feeCharged, error: out.error });
  logLine('submitted', { kind: p.kind, wallet: p.wallet, fn: p.fn, status: out.status, hash: out.hash, feeCharged: out.feeCharged, error: out.error });
  const body = { status: out.status, hash: out.hash, feeChargedXlm: XLM(out.feeCharged), returnValue: out.returnValue ?? null, error: out.error ?? null };
  return json(body, out.status === 'success' || out.status === 'pending' ? 200 : 422);
}

async function loadSponsor(cfg: RelayConfig): Promise<Account> {
  const a = await server(cfg).getAccount(cfg.sponsor!.publicKey());
  return new Account(a.accountId(), a.sequenceNumber());
}

async function activationNeeds(wallet: string, cfg: RelayConfig): Promise<ActivationNeeds> {
  const res = await fetch(`${HORIZON}/accounts/${wallet}`);
  if (res.status === 404) return { account: true, trustline: true };
  if (!res.ok) throw new Error(`horizon_${res.status}`);
  const acct = (await res.json()) as { balances: { asset_code?: string; asset_issuer?: string }[] };
  const has = acct.balances.some((b) => b.asset_code === cfg.usdc.getCode() && b.asset_issuer === cfg.usdc.getIssuer());
  return { account: false, trustline: !has };
}

const activationReserves = (n: ActivationNeeds) => (n.account ? ACCOUNT_RESERVES : 0) + (n.trustline ? TRUSTLINE_RESERVE : 0);

async function escrowWasmHash(cfg: RelayConfig): Promise<Uint8Array | null> {
  const key = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(cfg.escrowId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent,
    }),
  );
  const res = await server(cfg).getLedgerEntries(key);
  const entry = res.entries[0];
  if (!entry || entry.val.type !== 'contractData') return null;
  const v = entry.val.contractData.val;
  if (v.type !== 'scvContractInstance') return null;
  const exec = v.instance.executable;
  return exec.type === 'contractExecutableWasm' ? exec.wasmHash.value : null;
}

export async function handler(req: Request): Promise<Response> {
  const action = new URL(req.url).searchParams.get('action');
  const cfg = relayConfig();
  try {
    if (action === 'status' && req.method === 'GET') {
      return json({
        enabled: cfg.enabled,
        ...(cfg.offReason ? { reason: cfg.offReason } : {}),
        network: 'testnet',
        sponsor: cfg.enabled ? cfg.sponsor!.publicKey() : null,
        maxTxFeeXlm: XLM(cfg.maxTxFee),
        walletDailyCapXlm: XLM(cfg.walletDailyCap),
      });
    }
    if (req.method !== 'POST' || !['submit', 'activate', 'activate-submit', 'restore'].includes(action ?? '')) {
      return json({ error: 'not_found' }, 404);
    }
    if (!cfg.enabled) return json({ error: 'relay_unavailable' }, 503);
    const ip = clientIp(req);
    const ipHash = ip ? hmacHex(ip) : null;

    if (action === 'submit') {
      const body = await readBody(req);
      if (!body || typeof body.xdr !== 'string' || Object.keys(body).length !== 1) return json({ error: 'bad_request' }, 400);
      const policy = checkUserTx(body.xdr, cfg);
      if (policy.ok === false) {
        logLine('not_sponsored', { reason: policy.reason });
        return json({ error: 'not_sponsored', reason: policy.reason }, 400);
      }
      const inner = policy.tx;
      // Bid at least MIN_INCLUSION per op, and never below what the inner
      // transaction already offers (the network requires that).
      const ops = BigInt(inner.operations.length);
      const innerRate = (BigInt(inner.fee) - resourceFee(inner)) / ops;
      const base = innerRate > MIN_INCLUSION ? innerRate : MIN_INCLUSION;
      const fb = TransactionBuilder.buildFeeBumpTransaction(cfg.sponsor!, base.toString(), inner, cfg.passphrase);
      const feeMax = Number(fb.fee);
      if (feeMax > cfg.maxTxFee) return json({ error: 'not_sponsored', reason: 'fee_too_high' }, 400);
      fb.sign(cfg.sponsor!);
      return await sponsorAndSubmit(cfg, {
        tx: fb,
        innerHash: hex(inner.hash()),
        wallet: policy.source,
        ipHash,
        kind: policy.kind,
        feeMax,
        contract: policy.contract,
        fn: policy.fn,
        ops: policy.ops,
      });
    }

    if (action === 'restore') {
      const body = await readBody(req);
      if (!body || typeof body.transactionData !== 'string') return json({ error: 'bad_request' }, 400);
      let data: xdr.SorobanTransactionData;
      try {
        data = xdr.SorobanTransactionData.fromXdr(body.transactionData, 'base64');
      } catch {
        return json({ error: 'bad_request' }, 400);
      }
      const fp = data.resources.footprint;
      const needsCode = [...fp.readOnly, ...fp.readWrite].some((k) => k.type === 'contractCode');
      const reason = checkRestoreFootprint(data, cfg, needsCode ? await escrowWasmHash(cfg) : null);
      if (reason) return json({ error: 'not_sponsored', reason }, 400);
      const tx = buildRestore(await loadSponsor(cfg), data, cfg);
      tx.sign(cfg.sponsor!);
      return await sponsorAndSubmit(cfg, {
        tx,
        innerHash: hex(tx.hash()),
        wallet: cfg.sponsor!.publicKey(),
        ipHash,
        kind: 'restore',
        feeMax: Number(tx.fee),
        ops: ['restoreFootprint'],
      });
    }

    // Activation needs a wallet session (the wallet proved it owns the address).
    const wallet = sessionWallet(req);
    if (!wallet) return json({ error: 'unauthorized' }, 401);

    if (action === 'activate') {
      const needs = await activationNeeds(wallet, cfg);
      if (!needs.account && !needs.trustline) return json({ activated: true });
      const tx = buildActivation(await loadSponsor(cfg), wallet, needs, cfg);
      tx.sign(cfg.sponsor!);
      return json({ activated: false, needs, xdr: tx.toXDR(), networkPassphrase: cfg.passphrase });
    }

    // activate-submit
    const body = await readBody(req);
    if (!body || typeof body.xdr !== 'string') return json({ error: 'bad_request' }, 400);
    const checked = checkActivation(body.xdr, wallet, cfg);
    if (checked.ok === false) return json({ error: 'not_sponsored', reason: checked.reason }, 400);
    const ops = checked.tx.operations.map((o) => o.type);
    const needs = { account: ops.includes('createAccount'), trustline: ops.includes('changeTrust') };
    return await sponsorAndSubmit(cfg, {
      tx: checked.tx,
      innerHash: hex(checked.tx.hash()),
      wallet,
      ipHash,
      kind: 'activation',
      feeMax: Number(checked.tx.fee),
      reserves: activationReserves(needs),
      ops,
    });
  } catch (e) {
    logError('relay', e);
    return json({ error: 'server_error' }, 500);
  }
}

export default { fetch: handler };
