import { useState } from 'react';
import { Check } from 'lucide-react';
import { CONSENT_LINES } from '../../lib/consent';
import { Button } from '../Button';

// Versioned consent, captured before any document is accepted (data privacy).
export function ConsentStep({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <div>
      <h2 className="text-[16px] font-medium text-ink">Before we start</h2>
      <ul className="mt-3 space-y-2.5">
        {CONSENT_LINES.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate">
            <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <label className="mt-4 flex items-start gap-2.5 rounded-control bg-mist p-3 text-[14px] text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent)]"
        />
        <span>I have read and agree to the above.</span>
      </label>

      <Button className="mt-5 w-full" disabled={!checked} onClick={onAccept}>
        Continue
      </Button>
    </div>
  );
}
