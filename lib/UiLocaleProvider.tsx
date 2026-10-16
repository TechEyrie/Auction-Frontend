'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyDocumentLocale,
  isAdminPath,
  readStoredUiLang,
  resetDocumentLocale,
  uiDir,
  writeStoredUiLang,
  type UiLang,
} from './uiLocale.ts';
import { translate, type MessageKey } from './uiMessages.ts';

export type UiLocaleValue = {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
};

const UiLocaleContext = createContext<UiLocaleValue | null>(null);

export function UiLocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Server render and first client render are always English so hydration matches; the stored
  // choice is applied in an effect right after mount.
  const [lang, setLangState] = useState<UiLang>('en');

  useEffect(() => {
    const stored = readStoredUiLang();
    if (stored) setLangState(stored);
  }, []);

  useEffect(() => {
    if (isAdminPath(pathname)) {
      // Admin stays English/LTR and must not inherit RTL from a customer page.
      resetDocumentLocale();
      return;
    }
    applyDocumentLocale(lang, pathname);
  }, [lang, pathname]);

  const setLang = useCallback((next: UiLang) => {
    setLangState(next);
    writeStoredUiLang(next);
  }, []);

  const value = useMemo<UiLocaleValue>(
    () => ({
      lang,
      setLang,
      dir: uiDir(lang),
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>;
}

export function useUiLocale(): UiLocaleValue {
  const value = useContext(UiLocaleContext);
  if (!value) throw new Error('useUiLocale must be used inside <UiLocaleProvider>');
  return value;
}
