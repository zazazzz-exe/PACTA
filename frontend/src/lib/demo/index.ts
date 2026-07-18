// Demo mode: a hackathon presentation layer that runs the whole app on seeded
// data with simulated transactions, so a live demo works with no network. Every
// real code path stays untouched when the flag is off (each branch is
// `if (isDemo())`). Toggling reloads the app so modules re-init against the flag.

const KEY = 'pacta_demo';

export function isDemo(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDemo(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — no-op */
  }
}

// Valid Stellar G-addresses (format-checked by the app) used in the demo world.
export const DEMO_ADDRESS = 'GCO474RPUM4AOF5T4JA55YIFJKP5B3743F6AXD5M65WBB4SNLFTL43PS';
export const DEMO_LINKED = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
export const DEMO_COUNTERPARTY = 'GDCOP33NLUKXJXALCJCPTXJUGS42GZRM5YOYLS5RTKMLZNPORM2Z76GI';
