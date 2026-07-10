import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fresh filename probe: if this 404s, the latest deploy isn't going live (build
// failing). If it 500s, deploys work but the Node runtime crashes. Delete later.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, probe: 'healthz' });
}
