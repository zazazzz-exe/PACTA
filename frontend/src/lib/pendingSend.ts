// A tiny in-memory handoff from the Send screen to the protected create flow.
// Consume-once: reading it clears it, so a later manual visit to /create is not
// accidentally prefilled. Not persisted (a reload clears it, which is fine).
export interface PendingSend {
  trader: string; // recipient address
  capital: string; // human amount to protect
}

let pending: PendingSend | null = null;

export function setPendingSend(p: PendingSend): void {
  pending = p;
}

export function takePendingSend(): PendingSend | null {
  const p = pending;
  pending = null;
  return p;
}
