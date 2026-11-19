import type { Agreement } from './contract';
import { formatBaseUnits } from './money';
import { Status, tokenCodeForSac } from './pactSummary';

export type State = 'done' | 'current' | 'todo' | 'stopped';
export interface Step {
  title: string;
  detail?: string;
  state: State;
}

// Every step of a Pact from the contract state: setup (bond, deposit), each
// milestone with its tranche (the final one sweeps the remainder, PRD §8.2),
// then the outcome. Pure function so the screen and tests read the same thing.
export function pactSteps(a: Agreement): Step[] {
  const code = tokenCodeForSac(a.token);
  const n = Number(a.milestones);
  const released = Number(a.released_milestones);
  const tranche = n > 0 ? a.capital / BigInt(n) : 0n;
  const fmt = (v: bigint) => `${formatBaseUnits(v, code).display} ${code}`;
  const stopped = a.status === Status.Refunded || a.status === Status.Cancelled;
  const funded = a.bond_posted && a.capital_deposited;

  const steps: Step[] = [
    { title: 'Recipient bond posted', detail: fmt(a.bond), state: a.bond_posted ? 'done' : 'todo' },
    { title: 'Funds deposited', detail: fmt(a.capital), state: a.capital_deposited ? 'done' : 'todo' },
  ];
  for (let i = 0; i < n; i++) {
    const amount = i === n - 1 ? a.capital - tranche * BigInt(n - 1) : tranche;
    steps.push({ title: `Milestone ${i + 1} released`, detail: fmt(amount), state: i < released ? 'done' : 'todo' });
  }
  if (a.status === Status.Refunded) steps.push({ title: 'Refunded to the sender', state: 'stopped' });
  else if (a.status === Status.Cancelled) steps.push({ title: 'Pact cancelled', state: 'stopped' });
  else steps.push({ title: 'Completed, bond returned', state: a.status === Status.Completed ? 'done' : 'todo' });

  if (!stopped && a.status !== Status.Completed) {
    if (!funded) {
      // Bond and deposit can happen in either order: both are next.
      for (const st of steps.slice(0, 2)) if (st.state === 'todo') st.state = 'current';
    } else {
      const next = steps.findIndex((st) => st.state === 'todo');
      if (next >= 0) steps[next].state = 'current';
    }
  }
  return steps;
}
