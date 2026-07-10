import type { VercelRequest, VercelResponse } from '@vercel/node';

// Diagnostic: classic Vercel Node (req, res) signature. If this returns 200 but
// the { fetch } form did not, the project needs the legacy handler signature.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true });
}
