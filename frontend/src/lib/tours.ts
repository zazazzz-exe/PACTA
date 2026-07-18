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
    title: 'Send protected, as a Pact',
    body: 'Money leaves your wallet, locks in the contract, and releases in milestones, backed by the recipient bond.',
    placement: 'top',
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
    title: 'Your agreements',
    body: 'Every agreement you are part of shows up here, with its status and milestone progress.',
    placement: 'center',
  },
  {
    target: '[data-tour="filters"]',
    title: 'Filter by your role',
    body: 'Switch between agreements where you are the client and where you are the provider.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new"]',
    title: 'Create an agreement',
    body: 'Start a new protected agreement with a provider: set the capital, bond, milestones, and deadline.',
    placement: 'left',
  },
  {
    target: '[data-tour="card"]',
    title: 'Open an agreement',
    body: 'Tap a card to fund it, release milestones, complete it, or refund after the deadline.',
    placement: 'top',
  },
];
