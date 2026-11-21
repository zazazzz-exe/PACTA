# Pay by phone number (tracker tasks #21, #42)

A self-hosted SEP-2 federation directory: people pay a PACTA user by mobile
number instead of a wallet address.

## How it works

- **Register** (Profile, "Pay by phone number"): the signed-in wallet enters a
  mobile number. The server sends a 6-digit SMS code (10 minutes, 5 tries) and
  links the number when the code matches. One wallet per number and one number
  per wallet. Users can change or unlink their number anytime.
- **Pay** (Send): typing a number in the recipient field looks it up and shows
  the contact: the wallet address, and the masked name with a "Verified" badge
  if the owner passed identity verification. The payment goes to that address.
- **Public directory (opt-in):** "Findable by other Stellar wallets" lists the
  number in the public SEP-2 endpoint, so any Stellar wallet can resolve
  `+639171234567*getpacta.app`. It is off by default. In-app lookups work
  without it.

Code: `api/phone.ts`, `api/_lib/phone/`; frontend `lib/phoneClient.ts`,
`hooks/usePhoneRecipient.ts`, `components/PhoneCard.tsx`, `components/ContactCard.tsx`.
Migration `0006_phone_federation.sql`.

## Privacy

- **Numbers:** never stored. The database keeps `HMAC-SHA256(PHONE_PEPPER,
  "phone:" + E.164)`. `PHONE_PEPPER` is in the server environment, not the
  database, so a database leak alone cannot reverse the hashes. Rotating the
  pepper invalidates every link, and users would have to re-verify.
- **Codes:** also stored only as keyed hashes.
- **Event log** (`phone_event`): records kinds, wallets, number hashes and IP
  hashes. It never holds a raw number or IP.

## SMS sender (pluggable)

| `SMS_PROVIDER` | Use |
|---|---|
| `console` | Development. The code is written to the server log as `+63 ••• ••• 4567`, and returned to the app outside production so the flow can be finished without a phone. |
| `http` | Production. `POST SMS_GATEWAY_URL` with `{ "to", "text" }` and `Authorization: Bearer SMS_GATEWAY_TOKEN`. Put a telco SMS API or a self-hosted GSM modem gateway (Gammu, Kannel, an Android SMS gateway) behind that call, or add another sender in `api/_lib/phone/sms.ts`. |

- **Default:** `console` outside production.
- **Production:** refuses the console sender and no sender at all, returning
  `503 sms_unavailable`.
- **Development verifications:** numbers verified through the console sender
  never count in production, even if a preview wrote them to the same database.

## Anti-enumeration and abuse limits (`api/_lib/phone/store.ts`)

- **Codes:** 3 per wallet per 10 minutes and 10 per day; 3 per number per hour
  and 6 per day, so nobody can SMS-bomb a number; 10 per IP per hour.
- **Wrong codes:** 5 per code, 10 per wallet per hour.
- **In-app lookups:** need a signed-in session. Limits are 30 per wallet per
  hour, 200 per day, and only 10 misses per hour, so the directory cannot be
  walked number by number. There is also a cap of 60 per IP per hour.
- **Public SEP-2:**
  - 30 per IP per hour, and 10 misses per IP per hour.
  - Name lookups only. Reverse lookups by account are not supported, because
    the server cannot recover a number from its hash.
  - Only our own domains are accepted.
- **Registration:** a number already linked to another wallet returns
  `number_in_use` only after the caller proves they own the number with the SMS
  code.

## SEP-2 endpoint

- **Request:** `GET https://www.getpacta.app/federation?q=+639171234567*getpacta.app&type=name`.
  This is rewritten to `/api/phone?action=federation`, with CORS open.
- **Answer:** `{ "stellar_address", "account_id" }`, or 404 if the number is
  not listed. `type` other than `name` returns 501.
- **Discovery:** `https://getpacta.app/.well-known/stellar.toml` carries the
  `FEDERATION_SERVER`.

## Settings

- `PHONE_PEPPER` (required, 32+ random characters, server only)
- `SMS_PROVIDER`, `SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`
- `FEDERATION_DOMAIN` (default `getpacta.app,www.getpacta.app`)

## Not in this task

Sending to a number that is not registered yet (claimable funds with a timeout
refund) is planned separately.
