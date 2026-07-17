import type { Route } from './router';

export type TabName = 'home' | 'convert' | 'dashboard' | 'activity' | 'profile';

// Which bottom tab should read as active for a given route. Child/detail routes
// map to their parent tab; routes with no home tab (landing) return null.
export function tabForRoute(name: Route['name']): TabName | null {
  switch (name) {
    case 'home':
    case 'receive':
    case 'send':
      return 'home'; // Send/Receive are launched from Home
    case 'convert':
      return 'convert';
    case 'dashboard':
    case 'create':
    case 'detail':
    case 'trader':
      return 'dashboard'; // the Pacts tab
    case 'activity':
      return 'activity';
    case 'profile':
    case 'verify':
      return 'profile';
    case 'landing':
      return null;
  }
}
