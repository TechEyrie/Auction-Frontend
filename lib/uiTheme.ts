/**
 * Customer-site UI theme (light / dark).
 *
 * Pure helpers only — no React — so they stay unit-testable. The provider in
 * `UiThemeProvider.tsx` wires them to state.
 */

export type UiTheme = 'light' | 'dark';

export const UI_THEME_STORAGE_KEY = 'araq-ui-theme';

export function isUiTheme(value: unknown): value is UiTheme {
  return value === 'light' || value === 'dark';
}

export function readStoredUiTheme(): UiTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredUiTheme(theme: UiTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

function prefersDarkColorScheme(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Stored preference, else system preference, else light. */
export function resolveInitialTheme(): UiTheme {
  const stored = readStoredUiTheme();
  if (stored) return stored;
  return prefersDarkColorScheme() ? 'dark' : 'light';
}

/** Set `<html data-theme>` and `color-scheme` from the active UI theme. */
export function applyDocumentTheme(theme: UiTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
