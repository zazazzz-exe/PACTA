import type { TourStep } from '../components/Tour';

// Tours target elements by data-tour attribute. Steps whose target is missing
// are skipped automatically (see TourProvider.start).

export const landingSteps: TourStep[] = [
  {
    title: 'Welcome to PACTA',
    body: 'A non-custodial wallet for Stellar: hold, send, receive, and convert, and send protected when it matters. Here is a 30 second tour.',
    placement: 'center',
  },
  {
    target: '[data-tour="network"]',
    title: 'Runs on Stellar testnet',
    body: 'No sign up and no passwords. Everything happens on chain, and your wallet is your login.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="proof"]',
    title: 'Your wallet at a glance',
    body: 'Balance, assets, and one tap to send, receive, or convert. Send protected when a payment needs to be safe.',
    placement: 'left',
  },
  {
    target: '[data-tour="how"]',
    title: 'Everything money',
    body: 'Hold a multi-asset portfolio, send and receive on Stellar, and convert between assets, all from one wallet.',
    placement: 'top',
  },
  {
    target: '[data-tour="connect"]',
    title: 'Connect to start',
    body: 'Connect your wallet and your money is ready to move. You can replay this tour anytime from the help button.',
    placement: 'bottom',
  },
];

export const dashboardSteps: TourStep[] = [
  {
    title: 'Your Pacts',
    body: 'Every protected payment you have sent or received shows up here, with its status and progress.',
    placement: 'center',
  },
  {
    target: '[data-tour="filters"]',
    title: 'Filter by your side',
    body: 'Switch between Pacts you are paying and Pacts you are receiving.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new"]',
    title: 'Start a Pact',
    body: 'Create a new protected payment: set the amount, the bond, the milestones, and the deadline.',
    placement: 'left',
  },
  {
    target: '[data-tour="card"]',
    title: 'Open a Pact',
    body: 'Tap a card to fund it, release milestones, complete it, or refund after the deadline.',
    placement: 'top',
  },
];
