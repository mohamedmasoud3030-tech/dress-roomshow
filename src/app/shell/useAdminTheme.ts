import { useEffect, useState } from 'react';
import { getBrowserLocalStorage } from '@platform/storage';

export type AdminTheme = 'night' | 'day';

const STORAGE_KEY = 'carmen-admin-theme';

function readStoredTheme(): AdminTheme {
  try {
    return getBrowserLocalStorage()?.getItem(STORAGE_KEY) === 'day' ? 'day' : 'night';
  } catch {
    return 'night';
  }
}

/** Night is the operating room. Day is couture paper, not a cream template. */
export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(readStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.admin = 'true';
    root.dataset.theme = theme;
    try {
      getBrowserLocalStorage()?.setItem(STORAGE_KEY, theme);
    } catch {
      /* device storage is optional */
    }
    return () => {
      delete root.dataset.admin;
      delete root.dataset.theme;
    };
  }, [theme]);

  return {
    theme,
    setTheme,
    toggle: () => setTheme((current) => (current === 'night' ? 'day' : 'night')),
  };
}
