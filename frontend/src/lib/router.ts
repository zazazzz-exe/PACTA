import { useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'home' }
  | { name: 'receive' }
  | { name: 'convert' }
  | { name: 'activity' }
  | { name: 'profile' }
  | { name: 'send' }
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'detail'; id: bigint }
  | { name: 'trader'; address: string }
  | { name: 'verify' };

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
  if (h === '/verify') return { name: 'verify' };
  if (h === '/home') return { name: 'home' };
  if (h === '/receive') return { name: 'receive' };
  if (h === '/convert') return { name: 'convert' };
  if (h === '/activity') return { name: 'activity' };
  if (h === '/profile') return { name: 'profile' };
  if (h === '/send') return { name: 'send' };
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
