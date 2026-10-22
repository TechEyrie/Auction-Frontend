'use client';

import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { categoryRoots } from '../lib/catalog';
import { CategoryIcon } from '../lib/categoryIcons';
import { useAsync } from '../lib/useAsync';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';
import './header-search-overlay.css';

type Category = {
  key: string;
  name: string;
  parentKey: string | null;
  icon: string | null;
};

type HeaderSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  chromeT?: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const TRENDING_CATEGORY_KEYS = ['watches', 'perfume'] as const;

function SearchGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackChevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="header-search-overlay__back-icon">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeaderSearchOverlay({ open, onClose, chromeT }: HeaderSearchOverlayProps) {
  const { lang, t: baseT } = useUiLocale();
  const t = chromeT ?? baseT;
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${lang}`, { cache: 'no-store' }),
    [lang],
  );

  const roots = categoryRoots(categories.data?.categories ?? []);

  const trendingChips = useMemo(() => {
    const all = categories.data?.categories ?? [];
    const chips: { href: string; label: string }[] = [
      { href: '/browse?method=auction', label: t('footer.liveAuctions') },
      { href: '/browse?condition=used', label: t('home.usedItems') },
      { href: '/browse?q=iphone', label: t('home.iphone') },
      { href: '/browse?q=land+cruiser', label: t('home.landCruiser') },
    ];
    for (const key of TRENDING_CATEGORY_KEYS) {
      const cat = all.find((c) => c.key === key);
      if (cat) {
        chips.push({ href: `/browse?category=${encodeURIComponent(key)}`, label: cat.name });
      }
    }
    return chips;
  }, [categories.data, t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : '/browse');
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="header-search-overlay" role="dialog" aria-modal="true" aria-label={t('header.searchOverlay')}>
      <div className="header-search-overlay__top">
        <button type="button" className="header-search-overlay__back" onClick={onClose} aria-label={t('header.closeSearch')}>
          <BackChevron />
        </button>
        <form className="header-search-overlay__form" role="search" onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="sr">
            {t('header.searchOverlay')}
          </label>
          <div className="header-search-overlay__field">
            <SearchGlyph />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              className="header-search-overlay__input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('header.searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="header-search-overlay__submit" aria-label={t('header.search')}>
              <SearchGlyph />
            </button>
          </div>
        </form>
      </div>

      <div className="header-search-overlay__body">
        <section className="header-search-overlay__section" aria-label={t('header.trending')}>
          <h2 className="header-search-overlay__label">{t('header.trending')}</h2>
          <div className="header-search-overlay__chips">
            {trendingChips.map((chip) => (
              <button key={chip.href} type="button" className="header-search-overlay__chip" onClick={() => navigate(chip.href)}>
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        <section className="header-search-overlay__section" aria-label={t('header.popularCategories')}>
          <h2 className="header-search-overlay__label">{t('header.popularCategories')}</h2>
          {categories.loading && (
            <p className="header-search-overlay__hint" role="status">
              {t('header.popularCategoriesLoading')}
            </p>
          )}
          {!categories.loading && roots.length === 0 && (
            <p className="header-search-overlay__hint">{t('header.popularCategoriesEmpty')}</p>
          )}
          {roots.length > 0 && (
            <div className="header-search-overlay__grid">
              {roots.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className="header-search-overlay__tile"
                  onClick={() => navigate(`/browse?category=${encodeURIComponent(category.key)}`)}
                >
                  <span className="header-search-overlay__tile-icon">
                    <CategoryIcon icon={category.icon} size={42} />
                  </span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

export function HeaderSearchDrawerTrigger({ onOpen }: { onOpen: () => void }) {
  const { t } = useUiLocale();
  return (
    <button type="button" className="site-header__drawer-search" onClick={onOpen}>
      <SearchGlyph />
      <span>{t('header.searchPlaceholder')}</span>
    </button>
  );
}
