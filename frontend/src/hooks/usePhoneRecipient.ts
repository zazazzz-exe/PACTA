import { useEffect, useState } from 'react';
import { lookupPhone, looksLikePhone, phoneMessage, PhoneError, type Contact } from '../lib/phoneClient';

export type PhoneLookup =
  | { state: 'none' } // not a phone number
  | { state: 'looking' }
  | { state: 'found'; contact: Contact }
  | { state: 'missing' }
  | { state: 'error'; message: string };

// Resolve a phone number typed into the recipient field (debounced, so a
// lookup runs once the user stops typing; lookups are rate limited).
export function usePhoneRecipient(input: string): PhoneLookup {
  const [result, setResult] = useState<PhoneLookup>({ state: 'none' });
  useEffect(() => {
    if (!looksLikePhone(input)) {
      setResult({ state: 'none' });
      return;
    }
    let live = true;
    setResult({ state: 'looking' });
    const id = window.setTimeout(() => {
      lookupPhone(input.trim())
        .then((r) => live && setResult(r.found ? { state: 'found', contact: r } : { state: 'missing' }))
        .catch((e) => live && setResult({ state: 'error', message: phoneMessage(e instanceof PhoneError ? e.code : '') }));
    }, 500);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [input]);
  return result;
}
