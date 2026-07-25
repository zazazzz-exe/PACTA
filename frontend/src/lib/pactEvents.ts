import { Status, type Agreement } from './contract';
import type { AppEvent } from './notify';

// Pure diff: what changed between two reads of the same Pact -> alert events.
// Field names come from the `pacta` bindings (packages/pacta/dist/index.d.ts):
// bond_posted, capital_deposited, released_milestones, status.
export function pactEvents(prev: Agreement | null, next: Agreement): AppEvent[] {
  if (!prev) return []; // first load is not an event
  const events: AppEvent[] = [];

  if (!prev.bond_posted && next.bond_posted) events.push({ kind: 'pact-bond' });
  if (!prev.capital_deposited && next.capital_deposited) events.push({ kind: 'pact-deposit' });
  if (next.released_milestones > prev.released_milestones) events.push({ kind: 'pact-release' });
  if (prev.status !== Status.Completed && next.status === Status.Completed)
    events.push({ kind: 'pact-complete' });
  if (prev.status !== Status.Refunded && next.status === Status.Refunded)
    events.push({ kind: 'pact-refund' });

  return events;
}
