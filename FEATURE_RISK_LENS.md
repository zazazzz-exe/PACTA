# Pacta — Feature Spec: AI Risk Lens (FEATURE_RISK_LENS.md)

> An add-on feature. Build it **after** the core app and demo path work (PRD.md + DESIGN.md). It depends on the deployed contract and the design tokens already being in place.

---

## 0. How Claude Code should use this file

- This adds one feature: an AI that reads a trader's on-chain history and gives the investor a plain-language risk read plus a defensive milestone suggestion. It does not change anything else.
- It introduces **one serverless endpoint** (`/api/risk-lens`) so the Anthropic API key stays server-side. Everything else is client code that reuses the existing contract client and design tokens.
- Style every UI piece with the tokens from DESIGN.md (`accent`, `deadline`, `refund`, `slate`, etc.). No raw hex.
- Respect the responsible-AI boundary in §2: this assesses **counterparty risk from on-chain history**, never investment advice.
- Kickoff prompt is in §13.

---

## 1. What it is

When an investor is about to work with a trader, Pacta reads that trader's on-chain track record (completed deals, refunds, volume, recency, and how this deal compares to their history) and shows a short, plain-language read: a risk level, the specific signals behind it, and a concrete suggestion for how to structure *this* agreement more safely. With one tap, the investor can apply the suggested protection (milestone count) to the create form.

It is the highest-leverage "uniquely yours" feature because a non-crypto user cannot interpret raw reputation counts, but they can act on "12 completed, but 2 recent refunds, and this deal is larger than anything they've handled. Start with 4 milestones."

---

## 2. Responsible-AI boundary (non-negotiable)

The Risk Lens assesses **behavioral / counterparty trustworthiness from on-chain history only.** It must never:
- give investment advice or tell the user whether to invest,
- predict trading performance or estimate profit,
- guarantee outcomes.

Its only recommendations are within Pacta's own mechanics (milestone count, bond size, duration). This keeps it consistent with Pacta's stated position ("does not provide investment advice") and is enforced in the system prompt (§6).

Privacy note: only public on-chain data is sent to the API. No keys, no secrets, nothing the user wouldn't already see on a block explorer.

---

## 3. Architecture / data flow

```
 Investor enters / views a trader address
        │
        ▼
 Client: fetch the trader's agreements from the contract
   (get_count → get_agreement(i) loop, filter by trader)   ── prod: read from indexer/Supabase
        │
        ▼
 Client: computeTraderStats()  ── deterministic math (counts, rates, recency, deal-vs-history)
        │
        ▼
 POST /api/risk-lens  { stats }
        │
        ▼
 Serverless: Claude (Haiku) interprets stats → returns RiskRead JSON   ── API key server-side
        │
        ▼
 Client: <RiskLens> renders read + "Apply suggested protection"
```

The split matters: **code does the arithmetic, the model does the interpretation.** Counts are computed deterministically (never hallucinated); the model only turns correct numbers into plain language and a recommendation.

---

## 4. Where it reads data

MVP reads directly from the contract (hackathon scale is small):

```ts
async function fetchAllAgreements(contract): Promise<Agreement[]> {
  const { result: count } = await contract.get_count();
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  const results = await Promise.all(ids.map(id => contract.get_agreement({ agreement_id: id })));
  return results.map(r => r.result).filter(Boolean);
}
```

> Production: replace this with a query against the Supabase index (the `agreements` mirror), so you filter by trader in the database instead of fetching everything. Same `Agreement` shape downstream.

---

## 5. Feature computation (client, deterministic)

`frontend/src/lib/riskStats.ts`:

```ts
import type { Agreement } from '../../packages/pacta'; // generated bindings type

export interface TraderStats {
  address: string;
  hasHistory: boolean;
  totalAgreements: number;
  completed: number;
  refunded: number;
  active: number;
  pending: number;
  cancelled: number;
  completionRate: number | null;      // completed / (completed + refunded), null if none resolved
  totalVolumeXlm: number;
  avgDealXlm: number | null;
  largestDealXlm: number | null;
  refundsRecent: number;              // refunds whose deadline was within ~30 days (proxy, see §14)
  daysSinceLastActivity: number | null;
  contemplatedCapitalXlm: number | null;   // the deal the investor is considering (create flow)
  dealVsLargestRatio: number | null;       // contemplated / largestDeal
}

const toXlm = (base: bigint) => Number(base) / 1e7;

// Soroban enums render differently across binding versions — tolerate both.
function statusOf(a: any): string {
  const s = a.status;
  if (typeof s === 'string') return s;
  if (s && typeof s === 'object' && 'tag' in s) return s.tag;
  return String(s);
}

export function computeTraderStats(
  all: Agreement[],
  trader: string,
  contemplatedCapital?: bigint,
): TraderStats {
  const mine = all.filter((a: any) => a.trader === trader);
  const nowSec = Math.floor(Date.now() / 1000);
  const within30d = 30 * 86400;

  const by = (s: string) => mine.filter(a => statusOf(a) === s);
  const completed = by('Completed').length;
  const refunded = by('Refunded').length;
  const active = by('Active').length;
  const pending = by('Pending').length;
  const cancelled = by('Cancelled').length;

  const capitals = mine.map((a: any) => toXlm(a.capital));
  const totalVolumeXlm = capitals.reduce((s, v) => s + v, 0);
  const largestDealXlm = capitals.length ? Math.max(...capitals) : null;
  const avgDealXlm = capitals.length ? totalVolumeXlm / capitals.length : null;

  const refundsRecent = by('Refunded').filter(
    (a: any) => nowSec - Number(a.deadline) <= within30d,
  ).length;

  const activityTimes = mine.map((a: any) =>
    Number(a.start_time) > 0 ? Number(a.start_time) : Number(a.created_at),
  );
  const lastActivity = activityTimes.length ? Math.max(...activityTimes) : null;
  const daysSinceLastActivity =
    lastActivity != null ? Math.floor((nowSec - lastActivity) / 86400) : null;

  const resolved = completed + refunded;
  const contemplatedCapitalXlm =
    contemplatedCapital != null ? toXlm(contemplatedCapital) : null;

  return {
    address: trader,
    hasHistory: mine.length > 0,
    totalAgreements: mine.length,
    completed,
    refunded,
    active,
    pending,
    cancelled,
    completionRate: resolved > 0 ? completed / resolved : null,
    totalVolumeXlm: round(totalVolumeXlm),
    avgDealXlm: avgDealXlm != null ? round(avgDealXlm) : null,
    largestDealXlm: largestDealXlm != null ? round(largestDealXlm) : null,
    refundsRecent,
    daysSinceLastActivity,
    contemplatedCapitalXlm: contemplatedCapitalXlm != null ? round(contemplatedCapitalXlm) : null,
    dealVsLargestRatio:
      contemplatedCapitalXlm != null && largestDealXlm ? round(contemplatedCapitalXlm / largestDealXlm, 2) : null,
  };
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
```

---

## 6. Serverless endpoint (Claude lives here)

`frontend/api/risk-lens.ts` (Vercel/edge style; for Netlify/Cloudflare/Supabase Edge, adapt the handler signature and how the env var is read). Confirm the model string and headers at https://docs.claude.com/en/api/overview.

```ts
export const config = { runtime: 'edge' };

const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap; swap to the latest Haiku as needed

const SYSTEM = `You are the Pacta Risk Lens, a counterparty-risk assistant inside Pacta — a non-custodial escrow protocol on Stellar. In Pacta an investor locks capital for an independent trader; the capital is released in EQUAL milestone tranches (each tranche = capital / number_of_milestones), and the trader posts a refundable security bond. If the trader fails by the deadline, the investor reclaims the unreleased capital plus the bond.

Your job: help a non-expert investor judge how trustworthy a specific trader looks BASED ONLY on that trader's on-chain track record, and suggest how to structure THIS agreement to limit risk.

You receive a JSON object of already-computed, correct statistics. Do not recompute; interpret.

Strict boundaries:
- Assess behavioral / counterparty risk from on-chain history only. Do NOT give investment advice, predict trading performance, or estimate profit. Never say whether the deal is a good investment — only how trustworthy the track record looks and how to protect against this counterparty.
- Be honest and calibrated, not reassuring for its own sake. A clean, deep record is genuinely positive. Recent refunds, a thin or empty record, or a deal much larger than anything the trader has handled are genuine cautions. An address with no history is unproven and warrants caution, not a neutral rating.
- The only levers you may recommend are Pacta's own mechanics: number of milestones, bond size relative to capital, and shorter duration. Because tranches are EQUAL, reduce first exposure by recommending MORE milestones. Set suggested_first_milestone_pct to approximately round(100 / suggested_milestones).
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
  try {
    const { stats } = await req.json();
    const user = `Trader on-chain statistics (already computed and correct):\n\n${JSON.stringify(stats, null, 2)}\n\nReturn the risk read as JSON.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!r.ok) return json({ error: 'upstream' }, 502);

    const data = await r.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return json(parsed, 200);
  } catch {
    return json({ error: 'failed' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
```

Set `ANTHROPIC_API_KEY` in the host's environment variables (never in client code or the repo).

---

## 7. Response type

`frontend/src/lib/riskTypes.ts`:

```ts
export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';
export interface RiskSignal { label: string; detail: string; tone: 'positive' | 'neutral' | 'caution'; }
export interface RiskRead {
  risk_level: RiskLevel;
  headline: string;
  summary: string;
  signals: RiskSignal[];
  recommendation: string;
  suggested_milestones: number;
  suggested_first_milestone_pct: number;
}
```

---

## 8. Client hook

`frontend/src/hooks/useRiskLens.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import type { RiskRead } from '../lib/riskTypes';
import { computeTraderStats, type TraderStats } from '../lib/riskStats';
import { fetchAllAgreements } from '../lib/agreements'; // wrap the §4 helper
import { isValidStellarAddress } from '../lib/format';

interface State { data?: RiskRead; loading: boolean; error?: boolean; }

export function useRiskLens(trader: string | null, contemplatedCapital?: bigint): State {
  const [state, setState] = useState<State>({ loading: false });
  const cache = useRef<Map<string, RiskRead>>(new Map());

  useEffect(() => {
    if (!trader || !isValidStellarAddress(trader)) { setState({ loading: false }); return; }
    const key = `${trader}:${contemplatedCapital ?? ''}`;
    const cached = cache.current.get(key);
    if (cached) { setState({ loading: false, data: cached }); return; }

    let cancelled = false;
    setState({ loading: true });
    (async () => {
      try {
        const agreements = await fetchAllAgreements();
        const stats: TraderStats = computeTraderStats(agreements, trader, contemplatedCapital);
        const res = await fetch('/api/risk-lens', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ stats }),
        });
        if (!res.ok) throw new Error();
        const data: RiskRead = await res.json();
        if (cancelled) return;
        cache.current.set(key, data);
        setState({ loading: false, data });
      } catch {
        if (!cancelled) setState({ loading: false, error: true });
      }
    })();
    return () => { cancelled = true; };
  }, [trader, contemplatedCapital]);

  return state;
}
```

> Debounce the trader address upstream (call this hook with a value that updates ~600ms after the user stops typing) so it doesn't fire on every keystroke in the create form.

---

## 9. UI component

`frontend/src/components/RiskLens.tsx`. Styled with DESIGN.md tokens. Risk level and signal tone map to the existing palette so it feels native.

```tsx
import { ShieldCheck, AlertTriangle, CheckCircle2, Minus, Sparkles, Loader2 } from 'lucide-react';
import type { RiskRead, RiskLevel } from '../lib/riskTypes';

const levelStyle: Record<RiskLevel, { box: string; dot: string; label: string }> = {
  low:      { box: 'bg-accent-tint text-accent-deep',     dot: 'bg-accent',   label: 'Low risk' },
  moderate: { box: 'bg-mist text-slate',                  dot: 'bg-slate',    label: 'Moderate' },
  elevated: { box: 'bg-deadline-tint text-deadline-deep', dot: 'bg-deadline', label: 'Elevated' },
  high:     { box: 'bg-refund-tint text-refund-deep',     dot: 'bg-refund',   label: 'High risk' },
};

const toneIcon = {
  positive: <CheckCircle2 size={15} className="text-accent shrink-0" aria-hidden />,
  neutral:  <Minus size={15} className="text-slate shrink-0" aria-hidden />,
  caution:  <AlertTriangle size={15} className="text-deadline shrink-0" aria-hidden />,
};

export function RiskLens({
  read, loading, error, onApply,
}: {
  read?: RiskRead; loading?: boolean; error?: boolean;
  onApply?: (milestones: number, firstPct: number) => void;
}) {
  if (loading) {
    return (
      <div className="bg-paper border border-hairline rounded-card p-4 flex items-center gap-2.5 text-slate text-sm">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Reading on-chain history…
      </div>
    );
  }
  if (error || !read) {
    return (
      <div className="bg-mist rounded-control p-4 text-[13px] text-slate">
        Risk read unavailable right now. The trader's on-chain history is still shown above.
      </div>
    );
  }

  const s = levelStyle[read.risk_level];
  return (
    <div className="bg-paper border border-hairline rounded-card shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-pill ${s.box}`}>
          <span className={`w-1.5 h-1.5 rounded-pill ${s.dot}`} /> {s.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-fog">
          <Sparkles size={13} aria-hidden /> Risk lens
        </span>
      </div>

      <p className="text-[15px] font-medium text-ink mb-1">{read.headline}</p>
      <p className="text-[13px] text-slate mb-3">{read.summary}</p>

      <ul className="space-y-1.5 mb-3">
        {read.signals.map((sig, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
            {toneIcon[sig.tone]}
            <span><span className="font-medium">{sig.label}.</span> <span className="text-slate">{sig.detail}</span></span>
          </li>
        ))}
      </ul>

      <div className="bg-mist rounded-control p-3 flex items-start gap-2 mb-3">
        <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" aria-hidden />
        <p className="text-[13px] text-ink">{read.recommendation}</p>
      </div>

      {onApply && (
        <button
          onClick={() => onApply(read.suggested_milestones, read.suggested_first_milestone_pct)}
          className="w-full h-11 rounded-control bg-accent text-white text-sm font-medium hover:bg-accent-deep active:scale-[0.98] transition"
        >
          Apply suggested protection ({read.suggested_milestones} milestones)
        </button>
      )}

      <p className="text-[11px] text-fog mt-2.5">
        Based on this trader's on-chain history. A signal, not a guarantee.
      </p>
    </div>
  );
}
```

---

## 10. Placement

1. **Create agreement (primary, highest value).** Once a valid trader address is entered (debounced), render the lens above the summary card, passing the contemplated capital. Wire `onApply` to set the form's milestone count to `suggested_milestones`. Since the contract releases **equal** tranches, the defensive lever is milestone count, so applying the suggestion directly sets that field; the first-milestone percentage is informational (≈ 100 / milestones).

   ```tsx
   const lens = useRiskLens(debouncedTrader, capitalBaseUnits);
   <RiskLens
     read={lens.data} loading={lens.loading} error={lens.error}
     onApply={(milestones) => setMilestones(milestones)}
   />
   ```

2. **Trader / reputation profile.** Render `<RiskLens read={lens.data} ... />` with `useRiskLens(traderAddress)` (no contemplated capital). This is what an investor checks before reaching out.

3. **Agreement detail (optional).** For an `Active` agreement, show the lens as an ongoing read on the counterparty.

---

## 11. States and failure handling

- **Loading:** quiet "Reading on-chain history…" card with a spinner.
- **No history:** no special client branch needed. `computeTraderStats` sets `hasHistory: false`, and the prompt treats a new/empty address as a caution (typically `elevated`, recommending more milestones). This doubles as your anti-Sybil cue: a brand-new address gets flagged, not green-lit.
- **API error:** the component degrades to a neutral note and the raw reputation counts shown elsewhere remain. The core create/refund flow is **never** blocked by the lens.
- **Caching:** results cache per `(trader, contemplatedCapital)` for the session.

---

## 12. Cost and performance

- Haiku is fast and cheap; input is a small stats object and output is a small JSON. Each read is a fraction of a cent and returns in ~1–2s.
- Debounce the address input (~600ms) and cache per key so a typing user triggers at most one call per distinct address.
- If you make the endpoint public, add light rate limiting (per IP) and optionally cache reads server-side by `(trader, bucketedAmount)`.

---

## 13. Demo beat

In the create flow, paste a trader who has a mixed record and enter a capital larger than their largest past deal. The lens returns something like: "Elevated. Strong volume, but 2 refunds in the last month and this deal is about 3x their largest. Spread it across 4 milestones." Tap **Apply suggested protection** and watch the milestone count update to 4. That single moment shows AI doing something no other team's UI does: translating raw on-chain history into a protective action a first-time user can take.

---

## 14. Claude Code task list + kickoff

**Tasks:**
1. Add `frontend/src/lib/riskStats.ts` (§5), `riskTypes.ts` (§7), and an `agreements.ts` wrapper around the §4 fetch helper.
2. Add the serverless endpoint `frontend/api/risk-lens.ts` (§6). Set `ANTHROPIC_API_KEY` in the host env (document it in README, never commit it).
3. Add `useRiskLens` (§8) and `RiskLens` (§9), styled only with DESIGN.md tokens.
4. Place the lens in the create flow with `onApply` wired to the milestone field (§10.1), and on the trader profile (§10.2).
5. Verify the responsible-AI boundary holds (§2): the read never advises on the investment, only on counterparty trust and protective structuring.
6. Confirm graceful degradation when the endpoint is unreachable (§11).

**Kickoff prompt:**
```
Read FEATURE_RISK_LENS.md in full. Implement the AI Risk Lens exactly as specced,
as an add-on that changes nothing else in the app. Use the DESIGN.md tokens for all
UI. Keep the Anthropic key server-side in /api/risk-lens (env var ANTHROPIC_API_KEY).
The model does interpretation only — all counts come from computeTraderStats in code.
Place the lens in the create flow (wire "Apply suggested protection" to the milestone
field) and on the trader profile. Make sure the core flow still works if the endpoint
is down. Show me the create flow with the lens active so I can test it with a sample
trader address.
```

---

## 15. Refinements (optional, post-hackathon)

- **Precise recency:** the current refund-recency uses `deadline` as a proxy because the contract doesn't store when a status resolved. For exact timing, add `resolved_at: u64` to the `Agreement` struct (set it in `complete` and `emergency_refund`), update PRD.md §8, redeploy, and regenerate bindings. Alternatively, read the contract's events to timestamp resolutions.
- **Forced schema:** if JSON parsing is ever flaky, harden by using tool-use (function calling) to force the response shape instead of instruct-and-parse. See https://docs.claude.com/en/api/overview.
- **Indexer source:** swap §4's full enumeration for a Supabase query once the index exists, so the stats come from the database, not a full on-chain scan.
- **Reputation depth:** as volume grows, weight recent behavior more heavily and surface trend (improving vs declining) as an additional signal.
```
