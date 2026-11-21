import { randomInt } from 'crypto';
import { db } from './_lib/db.js';
import { clientIp, json, logError } from './_lib/http.js';
import { readSession } from './_lib/session.js';
import { hmacHex } from './_lib/kyc/hash.js';
import { isProduction } from './_lib/kyc/index.js';
import { resolveIdentity } from './_lib/kyc/identity.js';
import { normalizePhone, phoneHash, codeHash, sameHash } from './_lib/phone/number.js';
import { smsSender } from './_lib/phone/sms.js';
import {
  LIMITS,
  logEvent,
  otpLimited,
  verifyLimited,
  lookupLimited,
  federationLimited,
  linkByHash,
  linkByWallet,
  type PhoneLink,
} from './_lib/phone/store.js';

// Pay by phone number (docs/pay-by-phone.md): a self-hosted SEP-2 federation
// directory keyed by HMAC hashes of phone numbers.
//   GET  ?action=status       session: is a number linked, is it public
//   POST ?action=start        session: { phone } send an SMS code
//   POST ?action=verify       session: { code } link (or change) the number
//   POST ?action=unlink       session: remove the number
//   POST ?action=visibility   session: { public } opt in/out of public SEP-2
//   POST ?action=lookup       session: { phone } resolve a number in the app
//   GET  ?action=federation   public SEP-2 (/federation?q=+63...*getpacta.app&type=name),
//                             opt-in numbers only

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_BODY = 2048;
const FEDERATION_DOMAINS = () =>
  (process.env.FEDERATION_DOMAIN || 'getpacta.app,www.getpacta.app').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

function sessionWallet(req: Request): string | null {
  try {
    return readSession(req);
  } catch (e) {
    logError('phone-session', e);
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

const cors = { 'access-control-allow-origin': '*' };

// ---------------------------------------------------------------- SEP-2

async function federation(req: Request, ipHash: string | null): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q') ?? '';
  if (type !== 'name') return json({ detail: 'Only name lookups are supported.' }, 501, cors);
  const star = q.lastIndexOf('*');
  const phone = star > 0 ? normalizePhone(q.slice(0, star)) : null;
  const domain = star > 0 ? q.slice(star + 1).toLowerCase() : '';
  if (!phone || !FEDERATION_DOMAINS().includes(domain)) return json({ detail: 'Not found.' }, 404, cors);

  const supa = db();
  if (await federationLimited(supa, ipHash)) return json({ detail: 'Too many requests.' }, 429, cors);
  const hash = phoneHash(phone);
  const link = await linkByHash(supa, hash);
  if (!link || !link.public_federation) {
    await logEvent(supa, { kind: 'federation_miss', ipHash });
    return json({ detail: 'Not found.' }, 404, cors);
  }
  await logEvent(supa, { kind: 'federation', ipHash });
  return json({ stellar_address: `${phone}*${domain}`, account_id: link.wallet_address }, 200, cors);
}

// ---------------------------------------------------------------- handler

export async function handler(req: Request): Promise<Response> {
  const action = new URL(req.url).searchParams.get('action');
  const ip = clientIp(req);
  try {
    const ipHash = ip ? hmacHex(ip) : null;

    if (action === 'federation') {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (req.method !== 'GET') return json({ detail: 'Method not allowed.' }, 405, cors);
      return await federation(req, ipHash);
    }

    const routes: Record<string, 'GET' | 'POST'> = { status: 'GET', start: 'POST', verify: 'POST', unlink: 'POST', visibility: 'POST', lookup: 'POST' };
    if (!action || routes[action] !== req.method) return json({ error: 'not_found' }, 404);

    const wallet = sessionWallet(req);
    if (!wallet) return json({ error: 'unauthorized' }, 401);
    const supa = db();

    if (action === 'status') {
      const link = await linkByWallet(supa, wallet);
      return json({ linked: !!link, public: link?.public_federation ?? false, since: link?.created_at ?? null });
    }

    if (action === 'unlink') {
      await supa.from('phone_link').delete().eq('wallet_address', wallet);
      await logEvent(supa, { kind: 'unlinked', wallet });
      return json({ linked: false });
    }

    const body = await readBody(req);
    if (!body) return json({ error: 'bad_request' }, 400);

    if (action === 'visibility') {
      if (typeof body.public !== 'boolean') return json({ error: 'bad_request' }, 400);
      const link = await linkByWallet(supa, wallet);
      if (!link) return json({ error: 'not_linked' }, 404);
      await supa.from('phone_link').update({ public_federation: body.public, updated_at: new Date().toISOString() }).eq('wallet_address', wallet);
      return json({ linked: true, public: body.public });
    }

    if (action === 'lookup') {
      const phone = normalizePhone(body.phone);
      if (!phone) return json({ error: 'invalid_phone' }, 400);
      if (await lookupLimited(supa, wallet, ipHash)) return json({ error: 'rate_limited' }, 429);
      const hash = phoneHash(phone);
      await logEvent(supa, { kind: 'lookup', wallet, ipHash });
      const link = await linkByHash(supa, hash);
      if (!link) {
        await logEvent(supa, { kind: 'lookup_miss', wallet, ipHash });
        return json({ found: false });
      }
      // The contact card: the wallet, and whether its owner is identity verified.
      const id = await resolveIdentity(supa, link.wallet_address);
      const verified = id.status === 'verified';
      return json({ found: true, address: link.wallet_address, verified, maskedName: verified ? id.maskedName : null });
    }

    if (action === 'start') {
      const phone = normalizePhone(body.phone);
      if (!phone) return json({ error: 'invalid_phone' }, 400);
      const sender = smsSender();
      if (!sender) return json({ error: 'sms_unavailable' }, 503);
      const hash = phoneHash(phone);
      if (await otpLimited(supa, wallet, hash, ipHash)) return json({ error: 'rate_limited' }, 429);

      // One live code per wallet: a new code replaces the previous one.
      const now = new Date().toISOString();
      await supa.from('phone_otp').update({ consumed_at: now }).eq('wallet_address', wallet).is('consumed_at', null);
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const { data: row, error } = await supa
        .from('phone_otp')
        .insert({ wallet_address: wallet, phone_hash: hash, code_hash: 'pending', sender: sender.id, attempts: 0, expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      await supa.from('phone_otp').update({ code_hash: codeHash(row.id, code) }).eq('id', row.id);

      try {
        await sender.send(phone, `Your PACTA code is ${code}. It expires in 10 minutes. Never share it with anyone.`);
      } catch (e) {
        logError('phone-sms', e);
        await supa.from('phone_otp').update({ consumed_at: new Date().toISOString() }).eq('id', row.id);
        return json({ error: 'sms_failed' }, 502);
      }
      await logEvent(supa, { kind: 'otp_sent', wallet, phoneHash: hash, ipHash });
      // Development sender only: hand the code back so the flow can be finished
      // without a phone. Never in production (the console sender is refused there).
      const devCode = sender.id === 'console' && !isProduction() ? { devCode: code } : {};
      return json({ sent: true, expiresInSec: OTP_TTL_MS / 1000, ...devCode });
    }

    // verify
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) return json({ error: 'bad_code' }, 400);
    if (await verifyLimited(supa, wallet)) return json({ error: 'rate_limited' }, 429);
    const nowIso = new Date().toISOString();
    const { data: otp, error: otpErr } = await supa
      .from('phone_otp')
      .select('id, phone_hash, code_hash, sender, attempts')
      .eq('wallet_address', wallet)
      .is('consumed_at', null)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpErr) throw otpErr;
    if (!otp) return json({ error: 'no_code' }, 400);
    const tried = Number(otp.attempts ?? 0);
    if (tried >= LIMITS.otpAttempts) {
      await supa.from('phone_otp').update({ consumed_at: nowIso }).eq('id', otp.id);
      return json({ error: 'too_many_attempts' }, 400);
    }
    if (!sameHash(codeHash(otp.id, code), otp.code_hash)) {
      const attempts = tried + 1;
      await supa
        .from('phone_otp')
        .update({ attempts, ...(attempts >= LIMITS.otpAttempts ? { consumed_at: nowIso } : {}) })
        .eq('id', otp.id);
      await logEvent(supa, { kind: 'otp_failed', wallet, phoneHash: otp.phone_hash, ipHash });
      return json({ error: 'wrong_code', attemptsLeft: Math.max(0, LIMITS.otpAttempts - attempts) }, 400);
    }
    await supa.from('phone_otp').update({ consumed_at: nowIso }).eq('id', otp.id);

    // One wallet per number: a number already linked to another wallet stays
    // there (it must be unlinked from that wallet first).
    const existing: PhoneLink | null = await linkByHash(supa, otp.phone_hash);
    if (existing && existing.wallet_address !== wallet) return json({ error: 'number_in_use' }, 409);
    // A development-only row for this number (ignored in production) is replaced.
    await supa.from('phone_link').delete().eq('phone_hash', otp.phone_hash);
    // Changing your number: the old link goes.
    await supa.from('phone_link').delete().eq('wallet_address', wallet);
    const { error: linkErr } = await supa.from('phone_link').insert({
      phone_hash: otp.phone_hash,
      wallet_address: wallet,
      verified_via: otp.sender === 'console' ? 'console' : 'sms',
      public_federation: false,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (linkErr) throw linkErr;
    await logEvent(supa, { kind: 'linked', wallet, phoneHash: otp.phone_hash, ipHash });
    return json({ linked: true, public: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'phone_pepper_not_configured') {
      logError('phone', e);
      return json({ error: 'phone_unavailable' }, 503);
    }
    logError('phone', e);
    return json({ error: 'server_error' }, 500, action === 'federation' ? cors : undefined);
  }
}

export default { fetch: handler };
