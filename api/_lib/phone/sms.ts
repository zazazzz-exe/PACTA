import { isProduction } from '../kyc/index.js';
import { maskPhone } from './number.js';

// Pluggable SMS sender for phone verification codes.
//   SMS_PROVIDER=console  development: the code is written to the server log
//                         (and returned to the app outside production)
//   SMS_PROVIDER=http     a telco SMS API or a self-hosted GSM modem gateway
//                         (Gammu/Kannel/an Android SMS gateway) behind one HTTP call
// Production refuses to run with the console sender or none at all (fail
// closed), and numbers verified through the console sender never count there.

export interface SmsSender {
  id: 'console' | 'http';
  send(toE164: string, text: string): Promise<void>;
}

export const consoleSender: SmsSender = {
  id: 'console',
  async send(to, text) {
    console.info(JSON.stringify({ tag: 'sms-console', to: maskPhone(to), text }));
  },
};

// POST { to, text } as JSON to SMS_GATEWAY_URL with "Authorization: Bearer
// SMS_GATEWAY_TOKEN". Adapt a specific telco or modem gateway behind that
// contract (or add a sender here) without touching the endpoints.
export function httpSender(url: string, token: string, fetchImpl: typeof fetch = fetch): SmsSender {
  return {
    id: 'http',
    async send(to, text) {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`sms_gateway_${res.status}`);
    },
  };
}

type Env = Record<string, string | undefined>;

// The configured sender, or null when SMS is unavailable in this environment.
export function smsSender(env: Env = process.env): SmsSender | null {
  const id = (env.SMS_PROVIDER || (isProduction(env) ? '' : 'console')).trim();
  if (id === 'http') {
    if (!env.SMS_GATEWAY_URL || !env.SMS_GATEWAY_TOKEN) return null;
    return httpSender(env.SMS_GATEWAY_URL, env.SMS_GATEWAY_TOKEN);
  }
  if (id === 'console') return isProduction(env) ? null : consoleSender;
  return null;
}
