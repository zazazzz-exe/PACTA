// PACTA Risk Lens — serverless endpoint (Vercel Node function). The Gemini key
// stays server-side here; the client only ever sends already-computed stats.
// Spec: docs/product/FEATURE_RISK_LENS.md §6. Lives at the repo root so Vercel serves it at
// /api/risk-lens (the Vercel root is the repo root; see vercel.json).
//
// Hardening (PRD §17): requires the wallet-ownership session cookie, is
// rate-limited per session wallet and per (hashed) client IP, and validates the
// shape and size of the stats body before the model is ever called. Runs on
// Node (not Edge) because the session check uses jsonwebtoken.
import { db } from './_lib/db';
import { clientIp, logError } from './_lib/http';
import { readSession } from './_lib/session';
import { overLimit } from './_lib/ratelimit';
import { hmacHex } from './_lib/kyc/hash';
import { validateRiskLensBody, MAX_BODY_BYTES } from './_lib/riskLensInput';

// Per 10 minutes. The client caches reads and debounces input, so honest use
// stays far below these.
export const RISK_LENS_WINDOW_MS = 10 * 60 * 1000;
export const RISK_LENS_LIMIT_PER_WALLET = 30;
export const RISK_LENS_LIMIT_PER_IP = 60;

const MODEL = 'gemini-2.5-flash'; // fast + cheap, generous free tier

const SYSTEM = `You are the PACTA Risk Lens, a counterparty-risk assistant inside PACTA — a non-custodial escrow protocol on Stellar. In PACTA an investor locks capital for an independent trader; the capital is released in EQUAL milestone tranches (each tranche = capital / number_of_milestones), and the trader posts a refundable security bond. If the trader fails by the deadline, the investor reclaims the unreleased capital plus the bond.

Your job: help a non-expert investor judge how trustworthy a specific trader looks BASED ONLY on that trader's on-chain track record, and suggest how to structure THIS agreement to limit risk.

You receive a JSON object of already-computed, correct statistics. Do not recompute; interpret.

Strict boundaries:
- Assess behavioral / counterparty risk from on-chain history only. Do NOT give investment advice, predict trading performance, or estimate profit. Never say whether the deal is a good investment — only how trustworthy the track record looks and how to protect against this counterparty.
- Be honest and calibrated, not reassuring for its own sake. A clean, deep record is genuinely positive. Recent refunds, a thin or empty record, or a deal much larger than anything the trader has handled are genuine cautions. An address with no history is unproven and warrants caution, not a neutral rating.
- The only levers you may recommend are PACTA's own mechanics: number of milestones, bond size relative to capital, and shorter duration. Because tranches are EQUAL, reduce first exposure by recommending MORE milestones. Set suggested_first_milestone_pct to approximately round(100 / suggested_milestones).
- Speak plainly to a first-time user who may be new to crypto and managing hard-earned savings. Short sentences. No jargon, no hype, no emoji.

Output ONLY valid JSON, no markdown and no preamble, matching exactly:
{
  "risk_level": "low" | "moderate" | "elevated" | "high",
  "headline": "<= 90 chars plain-language verdict",
  "summary": "1-2 sentences explaining the read",
  "signals": [ { "label": "short factor", "detail": "one short clause", "tone": "positive" | "neutral" | "caution" } ],
  "recommendation": "one actionable sentence on how to structure this agreement",
  "suggested_milestones": 1-8 integer,
  "suggested_first_milestone_pct": 5-100 integer, approx 100/suggested_milestones
}`;

// Fails OPEN on limiter errors (same policy as overLimit): a database hiccup
// must not take the lens down, and the session check already gates access.
async function rateLimited(req: Request, wallet: string): Promise<boolean> {
  try {
    const supa = db();
    const ip = clientIp(req);
    const ipHash = ip ? hmacHex(ip) : null;
    const limited =
      (await overLimit(supa, 'risk_lens_call', { wallet_address: wallet }, RISK_LENS_WINDOW_MS, RISK_LENS_LIMIT_PER_WALLET)) ||
      (ipHash !== null &&
        (await overLimit(supa, 'risk_lens_call', { ip_hash: ipHash }, RISK_LENS_WINDOW_MS, RISK_LENS_LIMIT_PER_IP)));
    if (limited) return true;
    const { error } = await supa.from('risk_lens_call').insert({ wallet_address: wallet, ip_hash: ipHash });
    if (error) logError('risk-lens-ratelimit', error);
    return false;
  } catch (e) {
    logError('risk-lens-ratelimit', e);
    return false;
  }
}

function sessionWallet(req: Request): string | null {
  try {
    return readSession(req);
  } catch (e) {
    // SESSION_JWT_SECRET missing: treat as unauthenticated, never as open.
    logError('risk-lens-session', e);
    return null;
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const wallet = sessionWallet(req);
  if (!wallet) return json({ error: 'unauthorized' }, 401);

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
  const input = validateRiskLensBody(await req.text());
  if (!input.ok) {
    return json({ error: input.error, ...(input.field ? { field: input.field } : {}) }, input.error === 'too_large' ? 413 : 400);
  }

  if (await rateLimited(req, wallet)) return json({ error: 'rate_limited' }, 429);

  // Fail clearly when the key is not configured (the #1 cause of "Risk read
  // unavailable"). The key must live ONLY in the Vercel env, never in the repo.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[risk-lens] GEMINI_API_KEY is not set in this environment');
    return json({ error: 'missing_api_key' }, 500);
  }

  try {
    const { stats } = input;
    const user = `Trader on-chain statistics (already computed and correct):\n\n${JSON.stringify(stats, null, 2)}\n\nReturn the risk read as JSON.`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
            temperature: 0.4,
            // 2.5 Flash thinks by default; disable so the token budget goes to JSON.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
    if (!r.ok) {
      // Surface the real upstream status in the server logs (and a non-sensitive
      // status code to the client) so misconfig vs. bad key vs. rate limit is clear.
      const detail = await r.text().catch(() => '');
      console.error(`[risk-lens] Gemini upstream ${r.status}: ${detail.slice(0, 500)}`);
      return json({ error: 'upstream', upstreamStatus: r.status }, 502);
    }

    const data = await r.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return json(parsed, 200);
  } catch (e) {
    console.error('[risk-lens] handler failed', e);
    return json({ error: 'failed' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default { fetch: handler };
