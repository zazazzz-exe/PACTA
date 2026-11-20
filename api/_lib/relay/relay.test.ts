import { describe, it, expect } from 'vitest';
import {
  Account,
  Address,
  Asset,

  Keypair,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import { relayConfig } from './config';
import { checkUserTx } from './policy';
import { buildActivation, checkActivation, checkRestoreFootprint } from './sponsor';

const seed = (n: number) => Keypair.fromRawEd25519Seed(Buffer.alloc(32, n));
const SPONSOR = seed(50);
const USER = seed(51);
const OTHER = seed(52);
const cfg = relayConfig({ RELAYER_SECRET_KEY: SPONSOR.secret() });
const OTHER_TOKEN = new Asset('EURT', OTHER.publicKey());

function build(ops: xdr.Operation[], opts: { signer?: Keypair; source?: Keypair; timeout?: number; resourceFee?: bigint } = {}) {
  const src = opts.source ?? USER;
  const b = new TransactionBuilder(new Account(src.publicKey(), '100'), { fee: '100', networkPassphrase: cfg.passphrase });
  for (const op of ops) b.addOperation(op);
  if (opts.resourceFee !== undefined) b.setSorobanData(new SorobanDataBuilder().setResourceFee(opts.resourceFee).build());
  const tx = b.setTimeout(opts.timeout ?? 180).build();
  tx.sign(opts.signer ?? src);
  return tx;
}

const call = (contract: string, fn: string, auth?: xdr.SorobanAuthorizationEntry[]) =>
  Operation.invokeContractFunction({ contract, function: fn, args: [nativeToScVal(1n, { type: 'u64' })], auth });

const authEntry = (contract: string, fn: string, subs: xdr.SorobanAuthorizedInvocation[] = []) =>
  new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: invocation(contract, fn, subs),
  });
function invocation(contract: string, fn: string, subs: xdr.SorobanAuthorizedInvocation[] = []) {
  return new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new xdr.InvokeContractArgs({ contractAddress: new Address(contract).toScAddress(), functionName: fn, args: [] }),
    ),
    subInvocations: subs,
  });
}

const check = (tx: { toXDR(): string }) => checkUserTx(tx.toXDR(), cfg);
const reason = (tx: { toXDR(): string }) => {
  const r = check(tx);
  return r.ok ? 'ok' : r.reason;
};

describe('allowlist: what the relayer sponsors', () => {
  it('sponsors every escrow write call, with token transfers authorized inside it', () => {
    for (const fn of ['create_agreement', 'post_bond', 'deposit_capital', 'release_milestone', 'complete', 'emergency_refund', 'cancel', 'reclaim_bond']) {
      const tx = build([call(cfg.escrowId, fn, [authEntry(cfg.escrowId, fn, [invocation(cfg.xlmSac, 'transfer'), invocation(cfg.usdcSac, 'transfer')])])], { resourceFee: 400_000n });
      const r = check(tx);
      expect(r).toMatchObject({ ok: true, kind: 'soroban', contract: cfg.escrowId, fn, source: USER.publicKey() });
    }
  });
  it('sponsors USDC transfers and wallet operations', () => {
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '5' })]))).toBe('ok');
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: Asset.native(), amount: '5' })]))).toBe('ok');
    expect(reason(build([call(cfg.usdcSac, 'transfer')]))).toBe('ok');
    expect(
      reason(
        build([
          Operation.changeTrust({ asset: cfg.usdc }),
          Operation.pathPaymentStrictSend({ sendAsset: Asset.native(), sendAmount: '10', destination: USER.publicKey(), destAsset: cfg.usdc, destMin: '1', path: [] }),
        ]),
      ),
    ).toBe('ok');
  });
});

describe('allowlist: what it refuses', () => {
  it('refuses other contracts and functions', () => {
    expect(reason(build([call(cfg.escrowId, 'upgrade')]))).toBe('call_not_allowed');
    expect(reason(build([call(cfg.escrowId, 'get_agreement')]))).toBe('call_not_allowed');
    expect(reason(build([call(cfg.usdcSac, 'approve')]))).toBe('call_not_allowed');
    expect(reason(build([call(cfg.xlmSac, 'transfer')]))).toBe('call_not_allowed'); // only inside an escrow call
    const stranger = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';
    expect(reason(build([call(stranger, 'transfer')]))).toBe('call_not_allowed');
  });
  it('refuses an escrow call that authorizes anything unexpected', () => {
    const stranger = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';
    const tx = build([call(cfg.escrowId, 'post_bond', [authEntry(cfg.escrowId, 'post_bond', [invocation(stranger, 'transfer')])])]);
    expect(reason(tx)).toBe('auth_call_not_allowed');
    expect(reason(build([call(cfg.escrowId, 'post_bond', [authEntry(cfg.usdcSac, 'approve')])]))).toBe('auth_call_not_allowed');
  });
  it('refuses other assets and operations', () => {
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: OTHER_TOKEN, amount: '5' })]))).toBe('asset_not_allowed');
    expect(reason(build([Operation.changeTrust({ asset: OTHER_TOKEN })]))).toBe('asset_not_allowed');
    expect(reason(build([Operation.setOptions({ homeDomain: 'evil.example' })]))).toBe('op_not_allowed:setOptions');
    expect(reason(build([Operation.accountMerge({ destination: OTHER.publicKey() })]))).toBe('op_not_allowed:accountMerge');
    expect(reason(build([Operation.manageData({ name: 'x', value: 'y' })]))).toBe('op_not_allowed:manageData');
  });
  it('refuses transactions it cannot attribute or that are malformed', () => {
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' })], { signer: OTHER }))).toBe('not_signed_by_source');
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1', source: OTHER.publicKey() })]))).toBe('foreign_op_source');
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' })], { source: SPONSOR }))).toBe('sponsor_as_source');
    expect(reason(build(Array.from({ length: 6 }, () => Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' }))))).toBe('op_count');
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' })], { timeout: 3600 }))).toBe('validity_too_long');
    expect(reason(build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' })], { timeout: 0 }))).toBe('validity_too_long');
    expect(reason(build([call(cfg.escrowId, 'complete')], { resourceFee: 50_000_000n }))).toBe('resource_fee_too_high');
    expect(checkUserTx('AAAA', cfg)).toMatchObject({ ok: false, reason: 'bad_xdr' });
    const inner = build([Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' })]);
    const fb = TransactionBuilder.buildFeeBumpTransaction(OTHER, '200', inner, cfg.passphrase);
    fb.sign(OTHER);
    expect(reason(fb)).toBe('already_fee_bumped');
  });
  it('refuses transactions for another network', () => {
    const tx = new TransactionBuilder(new Account(USER.publicKey(), '1'), { fee: '100', networkPassphrase: 'Public Global Stellar Network ; September 2015' })
      .addOperation(Operation.payment({ destination: OTHER.publicKey(), asset: cfg.usdc, amount: '1' }))
      .setTimeout(180)
      .build();
    tx.sign(USER);
    expect(reason(tx)).toBe('not_signed_by_source'); // signature is over the other network's hash
  });
});

describe('sponsored activation', () => {
  const sponsorAccount = () => new Account(SPONSOR.publicKey(), '7');
  it('creates the account with 0 XLM and a USDC trustline, all reserves sponsored', () => {
    const tx = buildActivation(sponsorAccount(), USER.publicKey(), { account: true, trustline: true }, cfg);
    expect(tx.source).toBe(SPONSOR.publicKey());
    expect(tx.operations.map((o) => o.type)).toEqual(['beginSponsoringFutureReserves', 'createAccount', 'changeTrust', 'endSponsoringFutureReserves']);
    const create = tx.operations[1];
    expect(create.type === 'createAccount' && create.startingBalance).toBe('0.0000000');
  });
  it('only adds the trustline for an existing account', () => {
    const tx = buildActivation(sponsorAccount(), USER.publicKey(), { account: false, trustline: true }, cfg);
    expect(tx.operations.map((o) => o.type)).toEqual(['beginSponsoringFutureReserves', 'changeTrust', 'endSponsoringFutureReserves']);
    expect(() => buildActivation(sponsorAccount(), USER.publicKey(), { account: false, trustline: false }, cfg)).toThrow();
  });
  it('accepts back only what it built, for the session wallet, signed by that wallet', () => {
    const tx = buildActivation(sponsorAccount(), USER.publicKey(), { account: true, trustline: true }, cfg);
    tx.sign(SPONSOR);
    expect(checkActivation(tx.toXDR(), USER.publicKey(), cfg)).toMatchObject({ ok: false, reason: 'not_signed_by_wallet' });
    tx.sign(USER);
    expect(checkActivation(tx.toXDR(), USER.publicKey(), cfg).ok).toBe(true);
    expect(checkActivation(tx.toXDR(), OTHER.publicKey(), cfg)).toMatchObject({ ok: false, reason: 'not_for_this_wallet' });

    // A look-alike the relayer never signed is refused.
    const forged = buildActivation(sponsorAccount(), USER.publicKey(), { account: true, trustline: true }, cfg);
    forged.sign(USER);
    expect(checkActivation(forged.toXDR(), USER.publicKey(), cfg)).toMatchObject({ ok: false, reason: 'not_built_by_relayer' });
  });
});

describe('storage restore (rent)', () => {
  const dataKey = (contract: string) =>
    xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(contract).toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent,
      }),
    );
  const data = (keys: xdr.LedgerKey[], fee = 10_000n) => new SorobanDataBuilder().setReadWrite(keys).setResourceFee(fee).build();
  const stranger = 'CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526';

  it('restores only escrow and token storage, within the fee cap', () => {
    expect(checkRestoreFootprint(data([dataKey(cfg.escrowId), dataKey(cfg.xlmSac)]), cfg, null)).toBeNull();
    expect(checkRestoreFootprint(data([dataKey(stranger)]), cfg, null)).toBe('restore_not_allowed');
    expect(checkRestoreFootprint(data([dataKey(cfg.escrowId)], 50_000_000n), cfg, null)).toBe('resource_fee_too_high');
    expect(checkRestoreFootprint(data([]), cfg, null)).toBe('footprint_size');
  });
  it('restores contract code only when it is the escrow code', () => {
    const hash = new Uint8Array(32).fill(7);
    const code = xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash }));
    expect(checkRestoreFootprint(data([code]), cfg, hash)).toBeNull();
    expect(checkRestoreFootprint(data([code]), cfg, new Uint8Array(32).fill(8))).toBe('restore_not_allowed');
    expect(checkRestoreFootprint(data([code]), cfg, null)).toBe('restore_not_allowed');
  });
});

describe('config', () => {
  it('is off without a valid sponsor secret', () => {
    expect(relayConfig({}).enabled).toBe(false);
    expect(relayConfig({ RELAYER_SECRET_KEY: 'not-a-secret' }).enabled).toBe(false);
    expect(relayConfig({ RELAYER_SECRET_KEY: SPONSOR.secret(), RELAYER_DISABLED: 'true' }).enabled).toBe(false);
    expect(cfg.enabled).toBe(true);
  });
  it('has safe default limits', () => {
    expect(cfg).toMatchObject({ maxTxFee: 10_000_000, walletDailyCap: 50_000_000, globalDailyCap: 1_000_000_000, walletPerHour: 30, activationsPerDay: 50 });
  });
});
