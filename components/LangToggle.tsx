'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useUiLocale } from '../lib/UiLocaleProvider';

const LANGUAGE_OPTIONS: ReadonlyArray<{ id: 'en' | 'ar'; label: string; code: string }> = [
  { id: 'en', label: 'English', code: 'EN' },
  { id: 'ar', label: 'العربية', code: 'AR' },
];

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__location-chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type LangToggleProps = {
  variant?: 'header' | 'nav';
};

export function LangToggle({ variant = 'header' }: LangToggleProps) {
  const { lang, setLang, t } = useUiLocale();
  const isNav = variant === 'nav';
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = LANGUAGE_OPTIONS.find((o) => o.id === lang) ?? LANGUAGE_OPTIONS[0];

  const panelClass = isNav
    ? 'site-header__location-panel site-header__location-panel--drawer'
    : 'site-header__location-panel';

  return (
    <div className={isNav ? 'adm-nav-lang site-header__lang-wrap' : 'site-header__lang-wrap'} ref={wrapRef}>
      <button
        type="button"
        className={isNav ? 'site-header__pill site-header__lang adm-nav-lang__btn' : 'site-header__pill site-header__lang'}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? menuId : undefined}
        aria-label={t('header.selectLanguage')}
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
          <path
            d="M5 6h6.2L8.2 18H5.8L5 6zM14.5 9.5c1.6 0 2.8 1.1 2.8 2.6 0 1.8-1.4 2.9-3.5 2.9h-.6v1.5h-1.8V9.5h2.1zm-.3 1.6h-.8v2.3h.7c.9 0 1.4-.4 1.4-1.1 0-.7-.5-1.2-1.3-1.2z"
            fill="currentColor"
          />
          <path d="M18 6v2h-2v1.2H18V11h1.2V8h2V6.8h-2V6H18z" fill="currentColor" />
        </svg>
        <span className="site-header__lang-text">
          <span className="site-header__lang-primary">{current.label}</span>
          <span className="site-header__lang-code" aria-hidden="true">{current.code}</span>
        </span>
        <ChevronIcon />
      </button>
      {open ? (
        <div id={menuId} className={panelClass} role="listbox" aria-label={t('header.selectLanguage')}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={lang === option.id}
              className={lang === option.id ? 'site-header__location-option is-selected' : 'site-header__location-option'}
              onClick={() => {
                setLang(option.id);
                setOpen(false);
              }}
            >
              <span className="site-header__lang-text">
                <span className="site-header__lang-primary">{option.label}</span>
                <span className="site-header__lang-code" aria-hidden="true">{option.code}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
