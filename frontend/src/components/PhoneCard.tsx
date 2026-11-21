import { useEffect, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { Button } from './ui';
import {
  phoneStatus,
  startPhone,
  verifyPhone,
  unlinkPhone,
  setPhonePublic,
  phoneMessage,
  PhoneError,
  type PhoneStatus,
} from '../lib/phoneClient';

// Pay by phone (Profile): link a mobile number with an SMS code so people can
// pay you by number. Only a keyed hash of the number is stored. Optionally
// list it in the public Stellar directory (SEP-2) so other wallets can find you.

type Step = 'idle' | 'enter' | 'code';

export function PhoneCard() {
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    phoneStatus()
      .then(setStatus)
      .catch((e) => setError(phoneMessage(e instanceof PhoneError ? e.code : '')));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(phoneMessage(e instanceof PhoneError ? e.code : ''));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const r = await startPhone(phone);
      if (r.devCode) setCode(r.devCode); // development SMS sender only
      setStep('code');
    });
  const confirm = () =>
    run(async () => {
      await verifyPhone(code);
      setStatus(await phoneStatus());
      setStep('idle');
      setPhone('');
      setCode('');
    });
  const unlink = () =>
    run(async () => {
      await unlinkPhone();
      setStatus({ linked: false, public: false, since: null });
    });
  const togglePublic = () =>
    run(async () => {
      const r = await setPhonePublic(!status?.public);
      setStatus((s) => (s ? { ...s, public: r.public } : s));
    });

  return (
    <div className="rounded-card border border-hairline bg-paper p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-accent-tint text-accent">
          <Smartphone size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink">Pay by phone number</h2>
          <p className="mt-0.5 text-[13px] text-slate">
            {status?.linked
              ? 'Your number is linked. People can pay you by entering it on Send.'
              : 'Link your mobile number so people can pay you without your wallet address.'}
          </p>
        </div>
      </div>

      {status === null && !error ? (
        <div className="mt-3 h-10 animate-pulse rounded-control bg-mist" />
      ) : step === 'enter' ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="phone-number" className="text-[13px] font-semibold text-slate">
            Mobile number
          </label>
          <input
            id="phone-number"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0917 123 4567"
            className="mono h-12 w-full rounded-tile border border-card bg-deep px-3.5 text-[15px] text-ink placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStep('idle')} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={send} disabled={busy || phone.trim().length < 10}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Send code
            </Button>
          </div>
        </div>
      ) : step === 'code' ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="phone-code" className="text-[13px] font-semibold text-slate">
            6-digit code sent by SMS
          </label>
          <input
            id="phone-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="mono h-12 w-full rounded-tile border border-card bg-deep px-3.5 text-center text-[20px] tracking-[0.4em] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={send} disabled={busy}>
              Resend
            </Button>
            <Button size="sm" className="flex-1" onClick={confirm} disabled={busy || code.length !== 6}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Confirm
            </Button>
          </div>
        </div>
      ) : status?.linked ? (
        <div className="mt-3 space-y-3">
          <label className="flex min-h-tap cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-[14px] font-semibold text-ink">Findable by other Stellar wallets</span>
              <span className="block text-[12px] text-slate">Lists your number in the public Stellar directory. Off by default.</span>
            </span>
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={status.public} onChange={togglePublic} disabled={busy} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStep('enter')} disabled={busy}>
              Change number
            </Button>
            <Button size="sm" variant="ghost" onClick={unlink} disabled={busy}>
              Unlink number
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="mt-3" onClick={() => setStep('enter')} disabled={busy}>
          Link my number
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-refund">
          {error}
        </p>
      )}
    </div>
  );
}
