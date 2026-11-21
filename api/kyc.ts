import { json } from './_lib/http.js';
import { handler as erase } from './_kyc/erase.js';
import { handler as linkWallet } from './_kyc/link-wallet.js';
import { handler as refresh } from './_kyc/refresh.js';
import { handler as requestNonce } from './_kyc/request-nonce.js';
import { handler as startVerification } from './_kyc/start-verification.js';
import { handler as status } from './_kyc/status.js';
import { handler as submitMedia } from './_kyc/submit-media.js';
import { handler as unlinkWallet } from './_kyc/unlink-wallet.js';
import { handler as verifyWallet } from './_kyc/verify-wallet.js';
import { handler as webhook } from './_kyc/webhook.js';

// One Vercel function for every KYC endpoint (the Hobby plan allows 12
// functions). vercel.json rewrites /api/kyc-<op> to /api/kyc?op=<op>, so the
// public URLs are unchanged: /api/kyc-status, /api/kyc-webhook, and so on.
// Each endpoint keeps its own handler, checks and tests in api/_kyc/.

type Handler = (req: Request) => Promise<Response>;

export const KYC_ROUTES: Record<string, Handler> = {
  erase,
  'link-wallet': linkWallet,
  refresh,
  'request-nonce': requestNonce,
  'start-verification': startVerification,
  status,
  'submit-media': submitMedia,
  'unlink-wallet': unlinkWallet,
  'verify-wallet': verifyWallet,
  webhook,
};

// The op comes from the rewrite's query (?op=), or from the original path when
// the platform passes it through unchanged.
export function kycOp(url: URL): string | null {
  const q = url.searchParams.get('op');
  if (q) return q;
  const m = url.pathname.match(/\/api\/kyc-([a-z-]+)\/?$/);
  return m ? m[1] : null;
}

export async function handler(req: Request): Promise<Response> {
  const op = kycOp(new URL(req.url));
  const route = op && Object.prototype.hasOwnProperty.call(KYC_ROUTES, op) ? KYC_ROUTES[op] : null;
  if (!route) return json({ error: 'not_found' }, 404);
  return route(req);
}

export default { fetch: handler };
