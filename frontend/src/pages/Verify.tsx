import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { navigate } from '../lib/router';
import { friendlyError } from '../lib/errors';
import {
  startVerification,
  submitMedia,
  eraseKyc,
  fetchKycStatus,
  refreshFromProvider,
  type KycStatus,
  type ProviderMode,
} from '../lib/kycClient';

const RETURN_KEY = 'pacta.kyc.return';
import { Button } from '../components/Button';
import { IdentityBadge } from '../components/kyc/IdentityBadge';
import { ConsentStep } from '../components/kyc/ConsentStep';
import { DocumentCapture } from '../components/kyc/DocumentCapture';
import { LivenessCapture } from '../components/kyc/LivenessCapture';

type Step = 'consent' | 'document' | 'liveness' | 'submitting' | 'result';
type MockOutcome = 'pass' | 'fail' | 'pending';

const DOC_TYPES = [
  { id: 'national_id', label: 'National ID' },
  { id: 'passport', label: 'Passport' },
  { id: 'drivers_license', label: "Driver's license" },
];

export function Verify() {
  const { address, connect, kycStatus, kycLoading, refreshKyc } = useWallet();
  const [step, setStep] = useState<Step>('consent');
  const [docType, setDocType] = useState('national_id');
  const [country, setCountry] = useState('PH');
  const [file, setFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [mockOutcome, setMockOutcome] = useState<MockOutcome>('pass');
  const [resultStatus, setResultStatus] = useState<KycStatus | null>(null);
  const [providerMode, setProviderMode] = useState<ProviderMode | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // On mount: learn the provider mode, and if we just returned from a hosted
  // provider (Didit), sync the decision and show the result.
  useEffect(() => {
    let alive = true;
    fetchKycStatus()
      .then((s) => alive && setProviderMode(s.providerMode))
      .catch(() => {});

    if (sessionStorage.getItem(RETURN_KEY)) {
      sessionStorage.removeItem(RETURN_KEY);
      setStep('submitting');
      refreshFromProvider()
        .then((r) => alive && setResultStatus(r.kycStatus))
        .catch(() => {})
        .finally(async () => {
          await refreshKyc();
          if (alive) setStep('result');
        });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consent accepted: hosted providers redirect out; capture providers continue
  // to the in-app document/liveness steps.
  async function onConsent() {
    const mode = providerMode ?? (await fetchKycStatus().then((s) => s.providerMode).catch(() => 'capture' as ProviderMode));
    setProviderMode(mode);
    if (mode === 'hosted') {
      setErr(null);
      setStep('submitting');
      try {
        const res = await startVerification({});
        if (res.url) {
          sessionStorage.setItem(RETURN_KEY, '1');
          window.location.href = res.url;
          return;
        }
        setStep('document'); // fallback if no hosted url came back
      } catch (e) {
        setErr(friendlyError(e));
        setStep('consent');
      }
    } else {
      setStep('document');
    }
  }

  async function submit() {
    setErr(null);
    setStep('submitting');
    try {
      const { providerRef } = await startVerification({ docType, country });
      const fd = new FormData();
      if (file) fd.append('document', file, file.name);
      if (selfie) fd.append('selfie', selfie, 'selfie.jpg');
      const { status } = await submitMedia(providerRef, fd, mockOutcome);
      setResultStatus(status);
      await refreshKyc();
      setStep('result');
    } catch (e) {
      setErr(friendlyError(e));
      setStep('document');
    }
  }

  function restart() {
    setResultStatus(null);
    setErr(null);
    setFile(null);
    setSelfie(null);
    setStep('consent');
  }

  return (
    <div className="mx-auto max-w-app">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
          className="grid h-11 w-11 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Verify your identity</h1>
      </div>

      <div className="rounded-card border border-hairline bg-paper p-6 shadow-card">
        {!address ? (
          <Disconnected onConnect={connect} />
        ) : kycLoading ? (
          <Centered>
            <Loader2 className="animate-spin" size={20} aria-hidden />
          </Centered>
        ) : kycStatus === 'verified' ? (
          <Verified />
        ) : kycStatus === 'pending' && step !== 'result' ? (
          <Pending onRefresh={refreshKyc} loading={kycLoading} />
        ) : step === 'consent' ? (
          <ConsentStep onAccept={onConsent} />
        ) : step === 'document' ? (
          <DocumentStep
            docType={docType}
            setDocType={setDocType}
            country={country}
            setCountry={setCountry}
            file={file}
            setFile={setFile}
            onContinue={() => setStep('liveness')}
          />
        ) : step === 'liveness' ? (
          <LivenessStep
            selfie={selfie}
            setSelfie={setSelfie}
            mockOutcome={mockOutcome}
            setMockOutcome={setMockOutcome}
            err={err}
            onBack={() => setStep('document')}
            onSubmit={submit}
          />
        ) : step === 'submitting' ? (
          <Centered>
            <div className="flex items-center gap-2 text-slate">
              <Loader2 className="animate-spin" size={20} aria-hidden /> Verifying your identity
            </div>
          </Centered>
        ) : (
          <Result status={resultStatus} onRetry={restart} onRefresh={refreshKyc} />
        )}
      </div>

      {address && ['verified', 'pending', 'rejected', 'expired'].includes(kycStatus) && (
        <div className="mt-4 text-center">
          <EraseData onDone={refreshKyc} />
        </div>
      )}

      <p className="mt-4 text-center text-[12px] text-fog">
        Your documents go straight to the verification provider and are never stored by Pacta. This
        protects the app; the on-chain contract is unchanged.
      </p>
    </div>
  );
}

function EraseData({ onDone }: { onDone: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function erase() {
    setBusy(true);
    try {
      await eraseKyc();
      await onDone();
    } catch {
      /* ignore — the status refresh reflects reality */
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-[13px] text-refund hover:underline focus:outline-none focus-visible:underline"
      >
        Erase my identity data
      </button>
    );
  }
  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-3 text-[13px]">
      <span className="text-slate">Erase your verification data?</span>
      <button
        disabled={busy}
        onClick={erase}
        className="font-medium text-refund hover:underline disabled:opacity-50 focus:outline-none focus-visible:underline"
      >
        {busy ? 'Erasing' : 'Yes, erase'}
      </button>
      <button
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="text-slate hover:underline focus:outline-none focus-visible:underline"
      >
        Cancel
      </button>
    </div>
  );
}

function DocumentStep({
  docType,
  setDocType,
  country,
  setCountry,
  file,
  setFile,
  onContinue,
}: {
  docType: string;
  setDocType: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-[16px] font-medium text-ink">Your ID document</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">Document type</span>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="h-12 w-full rounded-control border border-hairline bg-paper px-3 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          >
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-slate">Issuing country</span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="PH"
            className="mono h-12 w-full rounded-control border border-hairline bg-paper px-3.5 text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </label>
      </div>

      <DocumentCapture file={file} onFile={setFile} />

      <Button className="w-full" disabled={!file} onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

function LivenessStep({
  selfie,
  setSelfie,
  mockOutcome,
  setMockOutcome,
  err,
  onBack,
  onSubmit,
}: {
  selfie: Blob | null;
  setSelfie: (b: Blob | null) => void;
  mockOutcome: MockOutcome;
  setMockOutcome: (v: MockOutcome) => void;
  err: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-[16px] font-medium text-ink">Liveness check</h2>
      <p className="text-[13px] text-slate">Take a quick selfie so we can match it to your ID.</p>

      <LivenessCapture blob={selfie} onBlob={setSelfie} />

      {/* Testnet-only: the sandbox provider lets you preview each outcome. */}
      <div className="rounded-control border border-dashed border-hairline bg-mist p-3">
        <p className="mb-2 text-[12px] font-medium text-fog">Simulated result (testnet)</p>
        <div className="grid grid-cols-3 gap-2">
          {(['pass', 'pending', 'fail'] as MockOutcome[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setMockOutcome(o)}
              className={`h-9 rounded-control text-[13px] font-medium transition ${
                mockOutcome === o
                  ? 'bg-accent text-white'
                  : 'border border-hairline bg-paper text-slate hover:bg-mist'
              }`}
            >
              {o === 'pass' ? 'Approve' : o === 'pending' ? 'Review' : 'Reject'}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="text-[13px] text-refund">{err}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" disabled={!selfie} onClick={onSubmit}>
          Submit for verification
        </Button>
      </div>
    </div>
  );
}

function Result({
  status,
  onRetry,
  onRefresh,
}: {
  status: KycStatus | null;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
}) {
  if (status === 'verified') return <Verified />;
  if (status === 'pending') return <Pending onRefresh={onRefresh} loading={false} />;
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-refund-tint text-refund">
        <AlertTriangle size={24} aria-hidden />
      </span>
      <h2 className="mt-4 text-[16px] font-medium text-ink">Verification did not pass</h2>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-slate">
        We could not verify your identity from what was submitted. You can try again with a clearer
        document.
      </p>
      <Button className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function Verified() {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-tint text-accent">
        <CheckCircle2 size={26} aria-hidden />
      </span>
      <h2 className="mt-4 flex items-center justify-center gap-2 text-[16px] font-medium text-ink">
        You're verified <IdentityBadge status="verified" />
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-slate">
        Your wallet is verified. You can now create and fund agreements.
      </p>
      <Button className="mt-5" onClick={() => navigate('/dashboard')}>
        Back to dashboard
      </Button>
    </div>
  );
}

function Pending({ onRefresh, loading }: { onRefresh: () => Promise<void>; loading: boolean }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-deadline-tint text-deadline-deep">
        <Clock size={24} aria-hidden />
      </span>
      <h2 className="mt-4 text-[16px] font-medium text-ink">Verification under review</h2>
      <p className="mx-auto mt-1 max-w-xs text-[14px] text-slate">
        We are reviewing your documents. This usually clears in a moment.
      </p>
      <Button className="mt-5" disabled={loading} onClick={() => void onRefresh()}>
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden /> Checking
          </>
        ) : (
          'Check status'
        )}
      </Button>
    </div>
  );
}

function Disconnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-tint text-accent">
        <ShieldCheck size={24} aria-hidden />
      </span>
      <p className="mt-4 text-[14px] text-slate">Connect your wallet to verify your identity.</p>
      <Button className="mt-4" onClick={onConnect}>
        Connect wallet
      </Button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center py-10 text-slate">{children}</div>;
}
