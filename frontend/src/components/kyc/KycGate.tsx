import { ShieldCheck, Loader2 } from 'lucide-react';
import type { KycStatus } from '../../lib/kycClient';
import { navigate } from '../../lib/router';
import { Button } from '../Button';

// Shown in place of a money action when the connected wallet is not verified.
// Copy is tailored to the specific status; the CTA sends the user to /verify.
const COPY: Record<
  Exclude<KycStatus, 'verified'>,
  { title: string; body: string; cta: string }
> = {
  unverified: {
    title: 'Verify your identity to continue',
    body: 'This action moves funds, so it needs a one-time identity check: a government ID and a quick liveness scan. It takes a couple of minutes.',
    cta: 'Start verification',
  },
  pending: {
    title: 'Verification in progress',
    body: 'We are reviewing your documents. This usually clears in a moment. You can act once it is verified.',
    cta: 'Check status',
  },
  rejected: {
    title: 'Verification did not pass',
    body: 'We could not verify your identity from what was submitted. You can try again with a clearer document.',
    cta: 'Try again',
  },
  expired: {
    title: 'Verification expired',
    body: 'Your identity verification is out of date. Verify again to keep moving funds.',
    cta: 'Verify again',
  },
  unknown: {
    title: 'Identity check unavailable',
    body: 'We could not reach the verification service. Reconnect your wallet or try again in a moment.',
    cta: 'Start verification',
  },
};

export function KycGate({ status, loading }: { status: KycStatus; loading?: boolean }) {
  if (loading) {
    return (
      <div className="mx-auto flex max-w-app items-center justify-center py-16 text-slate">
        <Loader2 className="animate-spin" size={20} aria-hidden />
      </div>
    );
  }

  const c = status === 'verified' ? COPY.unverified : COPY[status];

  return (
    <div className="mx-auto max-w-app">
      <div className="relative overflow-hidden rounded-card border border-accent/20 bg-gradient-to-br from-accent-tint to-paper p-8 text-center shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" aria-hidden />
        <div className="relative">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-pop">
            <ShieldCheck size={24} aria-hidden />
          </span>
          <h1 className="text-[18px] font-medium text-ink">{c.title}</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-[14px] text-slate">{c.body}</p>
          <Button className="mt-5" onClick={() => navigate('/verify')}>
            {c.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
