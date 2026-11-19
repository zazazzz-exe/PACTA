// UI strings for the Home screen and shared wallet surfaces, kept in one place
// so a Tagalog (or other) translation can be added later as another table.
// Rules (CLAUDE.md): no em-dashes in UI copy; PHP is always labeled an estimate.

export type Locale = 'en';

const en = {
  'greeting.morning': 'Good morning',
  'greeting.afternoon': 'Good afternoon',
  'greeting.evening': 'Good evening',
  'greeting.withName': '{greeting}, {name}',

  'balance.label': 'Total balance',
  'balance.show': 'Show balance',
  'balance.hide': 'Hide balance',
  'balance.hidden': 'Balance hidden',
  'balance.currency': 'Display currency',
  'balance.estimate': 'estimate',
  'balance.indicative': 'Indicative rate, not a quote',
  'balance.copyAddress': 'Copy address',

  'actions.title': 'Quick actions',
  'actions.send': 'Send',
  'actions.receive': 'Receive',
  'actions.convert': 'Convert',
  'actions.newPact': 'New Pact',
  'actions.pactsUnavailable': 'Pacts are not available on this network yet.',

  'tip.title': 'Protect your next payment',
  'tip.body': 'Send it as a Pact and release it in milestones.',
  'tip.cta': 'Try it',
  'tip.dismiss': 'Dismiss tip',

  'pacts.title': 'Active Pacts',
  'pacts.seeAll': 'See all',
  'pacts.empty.title': 'No active Pacts yet',
  'pacts.empty.body': 'A Pact holds a payment safely and releases it step by step.',
  'pacts.empty.cta': 'Start a Pact',
  'pacts.next': 'Next: milestone {n} of {total}',
  'pacts.awaitingBond': 'Waiting for the recipient bond',
  'pacts.awaitingDeposit': 'Waiting for the deposit',
  'pacts.allReleased': 'All milestones released',
  'pacts.youSend': 'You send',
  'pacts.youReceive': 'You receive',
  'pacts.progress': '{done} of {total} milestones released',

  'assets.title': 'Assets',
  'assets.refresh': 'Refresh',
  'assets.refreshing': 'Refreshing',
  'assets.showEmpty': 'Show empty assets ({count})',
  'assets.hideEmpty': 'Hide empty assets',
  'assets.unverified': 'Unverified',
  'assets.testnetOnly': 'Testnet only',
  'assets.empty': 'No assets yet. Receive some to get started.',
  'assets.noRate': 'No rate',

  'activity.title': 'Recent activity',
  'activity.seeAll': 'See all',
  'activity.empty': 'No activity yet. Payments you send or receive show up here.',
  'activity.received': 'Received',
  'activity.sent': 'Sent',
  'activity.from': 'from {who}',
  'activity.to': 'to {who}',

  'error.title': 'We could not load this',
  'error.retry': 'Try again',

  'sheet.close': 'Close',
  'sheet.send': 'Send',
  'sheet.receive': 'Receive',

  'connect.title': 'Your wallet',
  'connect.body': 'Connect a wallet to see your balance, send, receive, and convert.',

  'header.testnet': 'testnet',
  'header.help': 'Take a tour',
} as const;

export type StringKey = keyof typeof en;

const TABLES: Record<Locale, Record<StringKey, string>> = { en };
let current: Locale = 'en';

export function setLocale(locale: Locale): void {
  current = locale;
}

// t('greeting.withName', { greeting: 'Good morning', name: 'Juan' })
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const raw = TABLES[current][key] ?? en[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

// Time-of-day greeting: morning 5:00-11:59, afternoon 12:00-17:59, else evening.
export function greetingFor(date: Date, name?: string): string {
  const h = date.getHours();
  const greeting =
    h >= 5 && h < 12 ? t('greeting.morning') : h >= 12 && h < 18 ? t('greeting.afternoon') : t('greeting.evening');
  const clean = name?.trim();
  return clean ? t('greeting.withName', { greeting, name: clean.split(/\s+/)[0] }) : greeting;
}
