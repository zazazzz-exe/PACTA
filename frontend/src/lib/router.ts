import { useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'detail'; id: bigint }
  | { name: 'trader'; address: string };

export function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('/agreement/')) {
    const id = h.split('/')[2];
    if (id && /^\d+$/.test(id)) return { name: 'detail', id: BigInt(id) };
  }
  if (h.startsWith('/trader/')) {
    const addr = h.split('/')[2];
    if (addr && /^G[A-Z2-7]{55}$/.test(addr)) return { name: 'trader', address: addr };
  }
  if (h === '/dashboard') return { name: 'dashboard' };
  if (h === '/create') return { name: 'create' };
  return { name: 'landing' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}
