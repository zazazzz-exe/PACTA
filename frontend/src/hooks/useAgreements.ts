import { useCallback, useEffect, useState } from 'react';
import { getAllAgreements, getAgreement, type Agreement } from '../lib/contract';
import { friendlyError } from '../lib/errors';

export function useAgreements(publicKey?: string) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllAgreements(publicKey);
      // newest first
      all.sort((a, b) => Number(b.id - a.id));
      setAgreements(all);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { agreements, loading, error, refresh };
}

export function useAgreement(id: bigint | null, publicKey?: string) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (id == null) return;
    setLoading(true);
    setError(null);
    try {
      setAgreement(await getAgreement(id, publicKey));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [id, publicKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { agreement, loading, error, refresh };
}
