// PACTA Risk Lens — serverless endpoint (Vercel Edge). The Gemini key stays
// server-side here; the client only ever sends already-computed stats.
// Spec: FEATURE_RISK_LENS.md §6. Lives at the repo root so Vercel serves it at
// /api/risk-lens (the Vercel root is the repo root; see vercel.json).
export const config = { runtime: 'edge' };

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // Fail clearly when the key is not configured (the #1 cause of "Risk read
  // unavailable"). The key must live ONLY in the Vercel env, never in the repo.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[risk-lens] GEMINI_API_KEY is not set in this environment');
    return json({ error: 'missing_api_key' }, 500);
  }

  try {
    const { stats } = await req.json();
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
