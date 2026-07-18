# PACTA demo runbook (offline-safe pitch)

Demo mode runs the whole app on seeded data with simulated transactions, so the
demo works with **no network**. The offline outbox shows PACTA's low-connectivity
story. This is a presentation layer; real settlement still needs the network.

## Turn it on
1. Open the app. In the header, tap the **Demo** pill (it turns green: "Demo on")
   and the page reloads into demo mode.
2. Tap **Connect wallet** — it connects instantly to the seeded, verified demo
   wallet (no extension needed).

To leave demo mode, tap **Demo on** again.

## 60-second script
1. **Home** — show the portfolio: ₱42,580 (1,935 XLM + 120 USDC), Send / Receive /
   Convert, and the assets list.
2. **Go offline** — tap the **Online** pill in the header so it flips to **Offline**.
   A banner appears: "You are offline. Payments will queue…"
3. **Send** — go to Send, enter a recipient (any G... address) and an amount, tap
   **Queue payment** → confirm. You get a **Queued** receipt: "will send
   automatically when you are back online." The banner shows "1 payment queued".
4. **Reconnect** — tap **Offline** to flip back to **Online**. The banner shows
   "Delivering queued payments…" then "Delivered 1 queued payment." The payment
   now appears in **Activity**.
5. **Convert** — swap XLM to USDC; the balance and Activity update.
6. **Profile** — show Verified identity + linked wallets; tap **Link a wallet** to
   add another (simulated).
7. **Pacts** — open a Pact, release a milestone, and show the proof panel.

## Notes
- Everything in demo is seeded and simulated; tx hashes are fake ("demo…").
- The offline outbox also works outside demo: if a real connection drops, sends
  queue and auto-submit on reconnect (the signature happens at send time).
- Framing to judges: "Demo mode + a simulated offline queue to show the concept;
  real settlement is on Stellar."

## The recipient address for step 3
Any valid Stellar address works, e.g.
`GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI`.
