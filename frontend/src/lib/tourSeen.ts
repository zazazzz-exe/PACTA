// Tracks whether a given tour has been auto-shown. This is a UX preference, not
// a secret, so localStorage is appropriate (no keys or credentials are stored).
export function seenTour(key: string): boolean {
  try {
    return localStorage.getItem(`pacta.tour.${key}`) === '1';
  } catch {
    return true; // if storage is unavailable, do not nag with auto-tours
  }
}

export function markTourSeen(key: string): void {
  try {
    localStorage.setItem(`pacta.tour.${key}`, '1');
  } catch {
    /* ignore */
  }
}
