# PACTA KYC identity layer

Off-chain, server-mediated wallet identity verification. It is a **wallet-level**
gate: it gates the **app UI** for the wallet's **commitment actions** only; it
does **not** and cannot gate the frozen on-chain contract. Not part of the
escrow, never holds funds.

PACTA is a wallet-first app. Everyday wallet use is open — viewing the portfolio,
Receive, and reading the Risk Lens need no verification. **Send now** (a plain
payment) and **Convert** are ordinary self-custodial moves of the user's **own**
funds and are **not gated**. Verification is required only when a wallet makes a
commitment action:

- creating a Pact via **Send protected**,
- posting a bond,
- depositing capital,
- releasing a milestone.

Fund-returning actions (emergency refund, cancel, complete) are **never** gated,
so a verified or unverified party can always recover funds.

## Flow

1. **Connect** → the app auto-runs an ownership challenge every connect:
   `POST /api/kyc-request-nonce` → wallet signs the challenge (`signMessage`) →
   `POST /api/kyc-verify-wallet` verifies the ed25519 signature, consumes the
   nonce (single-use), and sets a short-lived session cookie.
2. **Verify** (`/verify`): consent → document photo → liveness selfie →
   `POST /api/kyc-start-verification` (records consent, inits provider) →
   `POST /api/kyc-submit-media` (streams media to the provider, persists only the
   result). Async providers also call `POST /api/kyc-webhook`.
3. **Gate**: the wallet's commitment actions — creating a Pact via "Send
   protected", posting a bond, depositing capital, and releasing a milestone —
   require `status = verified`. Send now, Convert, portfolio viewing, and Receive
   are never gated. Fund-returning actions (complete, refund, cancel) are never
   gated.

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

DB-backed abuse brakes (all fail open on a limiter error):
- **Nonce requests** (`kyc-request-nonce`), per minute: 5 per (address, client
  IP) pair, 20 per client IP across addresses, 30 per address across all IPs
  (backstop). Counting per (address, IP) means a caller spamming a victim's
  address only exhausts their own bucket and cannot lock the victim out. Only a
  keyed HMAC of the IP (`kyc_challenge.ip_hash`, `KYC_HASH_SECRET`) is stored,
  never the raw IP. With no IP header, the plain 5 per address limit applies.
- **Wallet verification** (`kyc-verify-wallet`): blocked after 10 failed
  signatures in 10 min, per address. Known gap: this one is still per address
  only, so an attacker could lock a victim out of signing in for 10 minutes.
- **Risk Lens** (`/api/risk-lens`), per 10 min: 30 per session wallet, 60 per
  hashed client IP (`risk_lens_call`).

These are abuse brakes only; put the real DDoS/IP control at the edge (Vercel
WAF / IP rate limits).

## Fail closed in production

In production (`VERCEL_ENV=production` on Vercel; `NODE_ENV=production` only
when `VERCEL_ENV` is absent, i.e. self-hosted) the server
refuses KYC when `KYC_PROVIDER` is unset or `mock`: `kyc-status`,
`kyc-start-verification`, `kyc-submit-media`, `kyc-refresh`, `kyc-webhook` and
`kyc-link-wallet` answer `503 { "error": "kyc_not_configured" }` and log the
reason. Wallet sign-in (`kyc-request-nonce`, `kyc-verify-wallet`) and the
data-removing endpoints (`kyc-erase`, `kyc-unlink-wallet`) stay available. In
development and on Vercel **preview** deployments, `mock` remains the default,
so the verification flow works end to end there. The sandbox approves every
submission, discards the media, and invents no name or document expiry. A
sandbox result never counts in production: `resolveIdentity` reads a
`provider = mock` verification as unverified there, so a preview sharing the
database cannot verify a wallet for the live app. The UI shows no sandbox
controls, and failed KYC calls show a plain retry message, never a status code.
See `api/_lib/kyc/index.ts` and `api/_lib/kyc/identity.ts`.

## Roadmap: linked identity across wallets (Phase 4, not yet built)

Today the model is **one verified identity per wallet** (`kyc_profile` is keyed by
wallet address). A planned Phase 4 change makes one verified identity own
**several** wallet addresses, so a user who verifies once keeps their status when
they connect another wallet, and logging in with any linked wallet resolves to
the same identity.

Design constraints for that change:

- **Linking is never silent.** A wallet cannot inherit an identity just by
  connecting. To attach a new wallet, the session must already be authenticated
  as the verified identity, and the **new** wallet must sign an ownership nonce
  (the same challenge as connect). Only proof of control of **both** wallets links
  them, so a stranger's wallet can never absorb someone else's KYC.
- **Schema.** Introduce an identity row that owns many wallet addresses (e.g. an
  `identity` table plus an `identity_wallet` join, or a nullable `identity_id` on
  `kyc_profile`); `status`/PII stay on the identity, not the wallet. Ownership
  nonces and the audit log stay per wallet.
- **UI.** A "Link wallet" action and an unlink flow in **Profile**; unlinking the
  last wallet or the verifying wallet needs an explicit rule (documented at build
  time).
- Stays inside this off-chain KYC exception: no funds, minimal PII, gates only the
  app UI. The frozen contract is unaffected.

This is scoped in `PRD.md` §5.3a and will be brainstormed into its own spec + plan
before any code.

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
  verified with `X-Signature-V2` / `X-Signature` / `X-Signature-Simple`.
  Freshness (±300s) is checked against the **signed body `timestamp`**, never
  the unsigned `X-Timestamp` header, and each signed delivery's digest is stored
  in `kyc_webhook_seen` so an exact repeat is rejected with 409 (the record is
  removed if applying the outcome fails, so a genuine retry still works). See
  `api/_lib/kyc/didit.ts` and `api/kyc-webhook.ts`.
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
4. Connect Freighter → sign the challenge → `/verify` → submit → status flips to
   `verified` and the commitment-action gates (Send protected, bond, deposit,
   release) open. The pending and rejected paths are covered by tests (the
   server still accepts an `x-mock-outcome` hint on the sandbox; the UI never
   sends it).

## Tests

`npm test` (repo root, Vitest): signature verification, session/JWT/cookie,
nonce validation, provider mock, webhook HMAC, and hashing. The RLS test in
`api/_lib/rls.integration.test.ts` runs only when `SUPABASE_URL` +
`SUPABASE_ANON_KEY` are set.
