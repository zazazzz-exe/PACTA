import type { TourStep } from '../components/Tour';

// Tours target elements by data-tour attribute. Steps whose target is missing
// are skipped automatically (see TourProvider.start).

export const landingSteps: TourStep[] = [
  {
    title: 'Welcome to PACTA',
    body: 'PACTA keeps money safe between a client and a provider, enforced by a smart contract. Here is a 30 second tour.',
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
    title: 'Proof, not promises',
    body: 'This panel shows the amount protected by the contract, linked to the live record on Stellar.',
    placement: 'left',
  },
  {
    target: '[data-tour="how"]',
    title: 'How it works',
    body: 'Lock capital, the provider posts a bond, then release in milestones or reclaim it if the deadline passes.',
    placement: 'top',
  },
  {
    target: '[data-tour="connect"]',
    title: 'Connect to start',
    body: 'Connect your wallet to create your first protected agreement. You can replay this tour anytime from the help button.',
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
