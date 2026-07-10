# PactAI KYC identity layer

Off-chain, server-mediated wallet identity verification. It gates the **app UI**
for money/commitment actions; it does **not** and cannot gate the frozen on-chain
contract. Not part of the escrow, never holds funds.

## Flow

1. **Connect** → the app auto-runs an ownership challenge every connect:
   `POST /api/kyc-request-nonce` → wallet signs the challenge (`signMessage`) →
   `POST /api/kyc-verify-wallet` verifies the ed25519 signature, consumes the
   nonce (single-use), and sets a short-lived session cookie.
2. **Verify** (`/verify`): consent → document photo → liveness selfie →
   `POST /api/kyc-start-verification` (records consent, inits provider) →
   `POST /api/kyc-submit-media` (streams media to the provider, persists only the
   result). Async providers also call `POST /api/kyc-webhook`.
3. **Gate**: creating an agreement and the additive money actions (post bond,
   deposit, release) require `status = verified`. Fund-returning actions
   (complete, refund, cancel) are never gated.

## Data stored (minimal)

Raw ID images and selfies are **streamed to the provider and never persisted**.
Only these are kept:

| Table | Contents | Notes |
|---|---|---|
| `kyc_profile` | status, provider + ref, doc type/country/expiry, `gov_id_hash`, `name_hash`, `masked_name` | hashes are keyed HMAC-SHA256; no plaintext ID/name |
| `kyc_challenge` | ownership nonces | single-use, 5-min TTL |
| `kyc_consent` | policy version, consent-text hash, timestamp | versioned consent |
| `kyc_event` | append-only audit | PII-free (reason codes, refs, transitions only) |

All tables have RLS enabled with **no policies** — only the service-role key (in
the `api/kyc-*` Node functions) can read/write. The browser holds no DB creds.

## Retention

- `kyc_challenge`: deleted at expiry (opportunistic cleanup on each nonce
  request); nothing lives beyond ~5 minutes.
- `kyc_profile`: retained while the wallet uses the app; **erased on request**
  (`POST /api/kyc-erase`) — status set to `erased`, every PII-derived column
  nulled, `gov_id_hash` cleared (so the identity may verify again later).
- `kyc_consent`: retained for the life of the profile; **deleted on erasure**.
- `kyc_event`: PII-free audit, retain up to **24 months**, then purge.

Adjust these to your jurisdiction; the PH Data Privacy Act 2012 is the working
baseline (versioned consent, minimization, erasure, PII-free logs).

## Rate limiting

Basic per-address DB brakes: 5 nonce requests/min; block wallet verification
after 10 failed signatures in 10 min. These are abuse brakes only — put the real
DDoS/IP control at the edge (Vercel WAF / IP rate limits).

## Environment

Server-only (Vercel env, or `.env` for `vercel dev`): `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_JWT_SECRET`, `KYC_HASH_SECRET`,
`KYC_PROVIDER` (`mock`), `KYC_WEBHOOK_SECRET`. See `.env.example`.

## Swapping in a real provider

Implement the `KycProvider` interface in `api/_lib/kyc/<vendor>.ts`, register it
in `api/_lib/kyc/index.ts`, and set `KYC_PROVIDER=<vendor>`. No endpoint, schema,
or frontend change is required. Confirm the vendor's webhook signing scheme in
`parseWebhook`, and confirm the installed Freighter's `signMessage` encoding
(the verifier already accepts both known variants).

Providers declare `capture`: `true` = the app captures the document + selfie and
streams them here (the `mock` provider); `false` = a hosted/redirect flow where
the user verifies on the provider's page and media never touches our server (the
`didit` provider). The frontend reads the mode from `/api/kyc-status`
(`providerMode`) and branches automatically.

## Using Didit (hosted)

Didit (https://didit.me) is built in as `KYC_PROVIDER=didit`. It is a **hosted**
flow: `/api/kyc-start-verification` creates a Didit session and returns a `url`;
the app redirects the user there; on return, `/api/kyc-refresh` pulls the
decision (and `/api/kyc-webhook` receives Didit's async callback). The ID and
selfie go straight to Didit — they never reach our server or DB.

One-time setup in the **Didit Business Console** (https://business.didit.me):

1. Create an organization, then **Workflows → Create Workflow** (enable Document
   + Liveness / Face Match). Copy the **Workflow ID**.
2. **Settings → API & Webhooks**: copy the **API key** and the **webhook secret**.
3. Set the **webhook URL** to your deployed `https://<your-app>/api/kyc-webhook`
   (Didit needs a public HTTPS URL — use your Vercel domain, not localhost).
4. Put these in your env and flip the provider:
   ```
   KYC_PROVIDER=didit
   DIDIT_API_KEY=...
   DIDIT_WORKFLOW_ID=...
   DIDIT_WEBHOOK_SECRET=...
   ```

Notes:
- The Didit API paths used are `POST /v3/session/` and
  `GET /v3/session/{id}/decision/` with the `x-api-key` header; the webhook is
  verified with `X-Signature-V2` / `X-Signature` / `X-Signature-Simple` and an
  `X-Timestamp` freshness check (±300s). See `api/_lib/kyc/didit.ts`.
- Decision field names (document number, name, expiry, country) are read
  defensively in `mapDecision`. Confirm them against your first real decision
  payload and adjust if a field is named differently in your workflow.
- Local `vercel dev` can create sessions and redirect, but Didit's **webhook**
  can't reach `localhost` — rely on the return-triggered `/api/kyc-refresh`
  locally, and configure the webhook on your deployed URL.

## Local run

1. Create a Supabase project; run `supabase/migrations/0001_kyc_identity.sql`.
2. Fill `.env` (copy from `.env.example`), keep `KYC_PROVIDER=mock`.
3. `vercel dev` at the repo root (plain `vite dev` does not serve `/api/*`).
4. Connect Freighter → sign the challenge → `/verify` → pick "Approve" → status
   flips to `verified` and the money-action gates open. "Review" exercises the
   pending/webhook path; "Reject" the rejected path.

## Tests

`npm test` (repo root, Vitest): signature verification, session/JWT/cookie,
nonce validation, provider mock, webhook HMAC, and hashing. The RLS test in
`api/_lib/rls.integration.test.ts` runs only when `SUPABASE_URL` +
`SUPABASE_ANON_KEY` are set.
