/**
 * Customer-site UI language (English / Arabic).
 *
 * Pure helpers only — no React — so they stay unit-testable. The provider in
 * `UiLocaleProvider.tsx` wires them to state.
 */

export type UiLang = 'en' | 'ar';

export const UI_LANG_STORAGE_KEY = 'araq-ui-lang';

export function isUiLang(value: unknown): value is UiLang {
  return value === 'en' || value === 'ar';
}

export function uiDir(lang: UiLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** The admin console is English/LTR only; it must never inherit the customer locale. */
export function isAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function readStoredUiLang(): UiLang | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(UI_LANG_STORAGE_KEY);
    return isUiLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredUiLang(lang: UiLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UI_LANG_STORAGE_KEY, lang);
  } catch {
    /* storage unavailable (private mode) — the in-memory choice still applies */
  }
}

/**
 * Set `<html lang dir>` for the chosen language. Admin routes are left alone by the caller
 * (see `isAdminPath`); when `pathname` is given and is an admin path this is a no-op.
 */
export function applyDocumentLocale(lang: UiLang, pathname?: string | null): void {
  if (typeof document === 'undefined') return;
  if (isAdminPath(pathname)) return;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = uiDir(lang);
}

/** Restore the default document locale (used when entering /admin from an Arabic page). */
export function resetDocumentLocale(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
}

/**
 * Pick a bilingual field for the active language, falling back to the other language when the
 * preferred one is empty. Returns `fallback` when neither is present.
 */
export function localizedText(
  text: { en: string | null; ar: string | null } | null | undefined,
  lang: UiLang = 'en',
  fallback = '',
): string {
  if (!text) return fallback;
  const order = lang === 'ar' ? [text.ar, text.en] : [text.en, text.ar];
  for (const candidate of order) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
  }
  return fallback;
}
