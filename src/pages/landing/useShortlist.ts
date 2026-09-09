import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBrowserLocalStorage } from '../../platform/storage';

const STORAGE_KEY = 'lena.landing.shortlist';

/**
 * A visitor's shortlist of pieces.
 *
 * Deliberately local and anonymous: no account, no network, nothing that
 * identifies the visitor. It survives a reload so she can browse, add pieces,
 * and send one WhatsApp request at the end — the way she would actually use a
 * showroom window.
 *
 * It still goes through the platform storage port: the port is what makes the
 * app survive a browser that blocks or disables storage.
 */
function read(): string[] {
  try {
    const raw = getBrowserLocalStorage()?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : [];
  } catch {
    return [];
  }
}

export function useShortlist() {
  const [codes, setCodes] = useState<string[]>([]);

  // Read after mount: localStorage is unavailable during SSR/prerender.
  useEffect(() => {
    setCodes(read());
  }, []);

  useEffect(() => {
    try {
      getBrowserLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify(codes));
    } catch {
      // A blocked storage quota must never break browsing.
    }
  }, [codes]);

  const toggle = useCallback((code: string) => {
    setCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }, []);

  const remove = useCallback((code: string) => {
    setCodes((current) => current.filter((item) => item !== code));
  }, []);

  const clear = useCallback(() => setCodes([]), []);

  const has = useMemo(() => (code: string) => codes.includes(code), [codes]);

  return { codes, toggle, remove, clear, has };
}
