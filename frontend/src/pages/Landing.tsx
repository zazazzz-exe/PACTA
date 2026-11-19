import { useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useTour } from '../components/Tour';
import { landingSteps } from '../lib/tours';
import { seenTour, markTourSeen } from '../lib/tourSeen';
import { navigate } from '../lib/router';
import { LandingNav } from './landing/LandingNav';
import { Hero } from './landing/Hero';
import { Marquee } from './landing/Marquee';
import { PaymentFlow } from './landing/PaymentFlow';
import { PactShowcase } from './landing/PactShowcase';
import { Features } from './landing/Features';
import { Trust } from './landing/Trust';
import { HowItWorks } from './landing/HowItWorks';
import { Faq } from './landing/Faq';
import { FinalCta } from './landing/FinalCta';
import { LandingFooter } from './landing/LandingFooter';
import { scrollToId } from './landing/parts';
import './landing/landing.css';

// Marketing landing page (task 16). An owner-approved exception to the calm app
// design: PACTA's navy / electric-blue identity, always dark, with richer motion
// (all of it stops under prefers-reduced-motion). Scoped by the .lp wrapper, so
// app screens keep the Midnight / Paper tokens. Renders its own nav and footer;
// App hides the app header and footer on this route.
export function Landing() {
  const { address, connect, connecting } = useWallet();
  const { start } = useTour();

  useEffect(() => {
    if (address) navigate('/home');
  }, [address]);

  useEffect(() => {
    if (address || seenTour('landing')) return;
    const t = setTimeout(() => {
      markTourSeen('landing');
      start(landingSteps);
    }, 1200);
    return () => clearTimeout(t);
  }, [address, start]);

  const onConnect = () => void connect();

  return (
    <div className="lp min-h-screen">
      <LandingNav onConnect={onConnect} onHelp={() => start(landingSteps)} connecting={connecting} />
      <div id="lp-main">
        <Hero onConnect={onConnect} onExplore={() => scrollToId('flow')} />
        <Marquee />
        <PaymentFlow />
        <PactShowcase onExplore={() => scrollToId('how')} />
        <Features onConnect={onConnect} onPacts={() => scrollToId('pacts')} />
        <Trust />
        <HowItWorks />
        <Faq />
        <FinalCta onConnect={onConnect} onHow={() => scrollToId('how')} />
      </div>
      <LandingFooter />
    </div>
  );
}
