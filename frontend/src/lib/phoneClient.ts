// Client for pay by phone (api/phone.ts, docs/pay-by-phone.md). Calls carry
// the wallet session cookie set at connect. Numbers are sent to the server only
// to hash them; nothing about them is stored in the browser.

export class PhoneError extends Error {
  constructor(public code: string, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

async function call<T>(action: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/phone?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PhoneError('network');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new PhoneError(res.status === 401 ? 'session' : String(data.error ?? res.status), data);
  return data as T;
}

export interface PhoneStatus {
  linked: boolean;
  public: boolean;
  since: string | null;
}

export interface Contact {
  found: true;
  address: string;
  verified: boolean;
  maskedName: string | null;
}

export const phoneStatus = () => call<PhoneStatus>('status');
export const startPhone = (phone: string) => call<{ sent: true; expiresInSec: number; devCode?: string }>('start', { phone });
export const verifyPhone = (code: string) => call<{ linked: true; public: boolean }>('verify', { code });
export const unlinkPhone = () => call<{ linked: false }>('unlink', {});
export const setPhonePublic = (pub: boolean) => call<{ linked: true; public: boolean }>('visibility', { public: pub });
export const lookupPhone = (phone: string) => call<Contact | { found: false }>('lookup', { phone });

// Does this look like a phone number rather than a Stellar address?
// Mirrors the server's normalization (Philippine local forms or +country code).
export function looksLikePhone(input: string): boolean {
  const s = input.trim().replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) || /^0\d{10}$/.test(s) || /^9\d{9}$/.test(s) || /^63\d{10}$/.test(s);
}

export function phoneMessage(code: string): string {
  switch (code) {
    case 'session':
      return 'Your session expired. Reconnect your wallet and try again.';
    case 'rate_limited':
      return 'Too many tries. Please wait a little and try again.';
    case 'invalid_phone':
      return 'Enter a mobile number, like 0917 123 4567 or +63 917 123 4567.';
    case 'wrong_code':
      return 'That code is not right. Check the SMS and try again.';
    case 'no_code':
    case 'too_many_attempts':
      return 'That code has expired. Send a new one.';
    case 'number_in_use':
      return 'This number is already linked to another wallet. Unlink it there first.';
    case 'sms_unavailable':
    case 'sms_failed':
    case 'phone_unavailable':
      return 'We cannot send SMS codes right now. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
