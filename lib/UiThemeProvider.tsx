'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyDocumentTheme,
  resolveInitialTheme,
  writeStoredUiTheme,
  type UiTheme,
} from './uiTheme.ts';

export type UiThemeValue = {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  toggleTheme: () => void;
};

const UiThemeContext = createContext<UiThemeValue | null>(null);

export function UiThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('light');
  const syncedFromStorageRef = useRef(false);

  useEffect(() => {
    let active = theme;
    if (!syncedFromStorageRef.current) {
      syncedFromStorageRef.current = true;
      active = resolveInitialTheme();
      if (active !== theme) setThemeState(active);
    }
    applyDocumentTheme(active);
  }, [theme]);

  const setTheme = useCallback((next: UiTheme) => {
    setThemeState(next);
    writeStoredUiTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: UiTheme = prev === 'light' ? 'dark' : 'light';
      writeStoredUiTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<UiThemeValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

export function useUiTheme(): UiThemeValue {
  const value = useContext(UiThemeContext);
  if (!value) throw new Error('useUiTheme must be used inside <UiThemeProvider>');
  return value;
}
