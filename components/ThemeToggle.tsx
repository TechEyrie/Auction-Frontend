'use client';

import { useCallback } from 'react';
import { chromeTranslate, useSiteChromeBody } from '../lib/siteChrome';
import { useUiLocale } from '../lib/UiLocaleProvider';
import { useUiTheme } from '../lib/UiThemeProvider';
import type { MessageKey } from '../lib/uiMessages';

type ThemeToggleProps = {
  variant: 'desktop' | 'drawer';
};

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
      <path
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ThemeToggle({ variant }: ThemeToggleProps) {
  const { theme, toggleTheme } = useUiTheme();
  const { lang, t: baseT } = useUiLocale();
  const headerChrome = useSiteChromeBody('header');
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      chromeTranslate(lang, baseT, headerChrome, key, vars),
    [lang, baseT, headerChrome],
  );

  const isDark = theme === 'dark';
  const ariaLabel = isDark ? t('header.themeToLight') : t('header.themeToDark');
  const targetLabel = isDark ? t('header.themeLight') : t('header.themeDark');

  const className =
    variant === 'drawer'
      ? 'site-header__pill site-header__theme site-header__theme--drawer'
      : 'site-header__pill site-header__theme';

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={toggleTheme}>
      {isDark ? <SunIcon /> : <MoonIcon />}
      {variant === 'drawer' ? <span className="site-header__theme-label">{targetLabel}</span> : null}
    </button>
  );
}
