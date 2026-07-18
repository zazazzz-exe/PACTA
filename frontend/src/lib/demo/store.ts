// In-memory demo state, seeded fresh on load. A simulated send/convert mutates
// balances and prepends an activity item. Resets on reload, so each demo run is
// predictable.
import type { AssetBalance } from '../adapters/ChainAdapter';
import { humanToBaseUnits, baseUnitsToHuman } from '../adapters/ChainAdapter';
import type { ActivityItem } from '../activity';
import { withDisplayValues } from '../prices';
import { DEMO_COUNTERPARTY } from './index';

const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const OTHER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

interface Bal {
  code: string;
  issuer?: string;
  amount: string;
}
interface DemoState {
  balances: Bal[];
  activity: ActivityItem[];
  seq: number;
}

function seed(): DemoState {
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  return {
    balances: [
      { code: 'XLM', amount: '1935.2000000' },
      { code: 'USDC', issuer: USDC_ISSUER, amount: '120.0000000' },
    ],
    activity: [
      { id: 'd1', kind: 'received', counterparty: DEMO_COUNTERPARTY, assetCode: 'XLM', amount: '250.0000000', createdAt: iso(6), hash: 'demoseed0000000000000000000000000000000000000000000000000000000a' },
      { id: 'd2', kind: 'sent', counterparty: OTHER, assetCode: 'USDC', amount: '30.0000000', createdAt: iso(95), hash: 'demoseed0000000000000000000000000000000000000000000000000000000b' },
      { id: 'd3', kind: 'received', counterparty: DEMO_COUNTERPARTY, assetCode: 'XLM', amount: '500.0000000', createdAt: iso(60 * 27), hash: 'demoseed0000000000000000000000000000000000000000000000000000000c' },
      { id: 'd4', kind: 'sent', counterparty: OTHER, assetCode: 'XLM', amount: '75.0000000', createdAt: iso(60 * 74), hash: 'demoseed0000000000000000000000000000000000000000000000000000000d' },
    ],
    seq: 0x100,
  };
}

let state = seed();

export function resetDemo(): void {
  state = seed();
}

export function demoBalances(): AssetBalance[] {
  const parsed: AssetBalance[] = state.balances.map((b) => ({
    asset: b.issuer ? { code: b.code, issuer: b.issuer } : { code: b.code },
    amount: b.amount,
    baseUnits: humanToBaseUnits(b.amount),
  }));
  return withDisplayValues(parsed);
}

export function demoActivity(): ActivityItem[] {
  return state.activity.map((a) => ({ ...a }));
}

export function demoFakeHash(): string {
  state.seq += 1;
  return ('demo' + state.seq.toString(16)).padEnd(64, '0').slice(0, 64);
}

function adjust(code: string, issuer: string | undefined, deltaBase: bigint): void {
  const bal = state.balances.find((b) => b.code === code && (b.issuer ?? undefined) === (issuer ?? undefined));
  if (bal) {
    const next = humanToBaseUnits(bal.amount) + deltaBase;
    bal.amount = baseUnitsToHuman(next < 0n ? 0n : next);
  } else if (deltaBase > 0n) {
    state.balances.push({ code, issuer, amount: baseUnitsToHuman(deltaBase) });
  }
}

// Debit `amount` of the asset and record a sent activity item.
export function demoRecordSend(
  code: string,
  issuer: string | undefined,
  amount: string,
  to: string,
  hash: string,
  nowIso: string,
): void {
  adjust(code, issuer, -humanToBaseUnits(amount));
  state.activity.unshift({ id: hash, kind: 'sent', counterparty: to, assetCode: code, amount, createdAt: nowIso, hash });
}

// Debit the from-asset, credit the to-asset, and record a received item.
export function demoRecordSwap(
  from: { code: string; issuer?: string },
  to: { code: string; issuer?: string },
  amountIn: string,
  amountOut: string,
  hash: string,
  nowIso: string,
): void {
  adjust(from.code, from.issuer, -humanToBaseUnits(amountIn));
  adjust(to.code, to.issuer, humanToBaseUnits(amountOut));
  state.activity.unshift({ id: hash, kind: 'received', counterparty: DEMO_COUNTERPARTY, assetCode: to.code, amount: amountOut, createdAt: nowIso, hash });
}
