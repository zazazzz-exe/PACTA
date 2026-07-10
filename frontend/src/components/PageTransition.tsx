import { useEffect, useState, type ReactNode } from 'react';

export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <div key={routeKey} className={reduceMotion ? undefined : 'animate-rise'}>
      {children}
    </div>
  );
}

export function routeKey(route: {
  name: string;
  id?: bigint;
  address?: string;
}): string {
  if (route.name === 'detail' && route.id !== undefined) return `detail-${route.id}`;
  if (route.name === 'trader' && route.address) return `trader-${route.address}`;
  return route.name;
}
