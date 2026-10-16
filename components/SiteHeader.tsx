'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { css } from '../lib/css';
import { browseHrefForPlace, placeLabel, QATAR_PLACES } from '../lib/qatarPlaces';
import { useSession } from '../lib/session';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';

const UI_CITY_STORAGE_KEY = 'araq-ui-city';
const DEFAULT_CITY = 'Doha';

type NavItem = {
  id: string;
  labelKey: MessageKey;
  href: string;
  dot?: boolean;
};

function buildNav(home?: boolean): NavItem[] {
  return [
    { id: 'auction', labelKey: 'nav.auction', href: '/auctions', dot: true },
    { id: 'accessories', labelKey: 'nav.accessories', href: '/browse?q=accessories' },
    { id: 'sell', labelKey: 'nav.sell', href: '/contact' },
    { id: 'how', labelKey: 'nav.how', href: home ? '#how' : '/#how' },
    { id: 'shop', labelKey: 'nav.shop', href: '/browse' },
  ];
}

const ACTIVE_ALIASES: Record<string, string[]> = {
  auction: ['auction', 'auctions'],
  accessories: ['accessories', 'categories'],
  sell: ['sell'],
  how: ['how', 'help'],
  shop: ['shop', 'buy'],
};

function isNavActive(itemId: string, active?: string): boolean {
  if (!active) return false;
  const ids = ACTIVE_ALIASES[itemId] ?? [itemId];
  return ids.includes(active);
}

type Props = {
  active?: string;
  navCurrent?: boolean;
  home?: boolean;
  showSignIn?: boolean;
};

function BrandMark({ home, homeLabel }: { home?: boolean; homeLabel: string }) {
  const inner = (
    <>
      <img src="/logo.png" alt="" width={44} height={44} className="site-header__logo" />
      <span className="site-header__brand-text">
        <span className="site-header__brand-name">ARAQ &amp; KAHRAMAN</span>
        <span className="site-header__brand-sub">AUCTIONS</span>
      </span>
    </>
  );
  if (home) {
    return (
      <a href="#top" aria-label={homeLabel} className="site-header__brand">
        {inner}
      </a>
    );
  }
  return (
    <Link href="/" aria-label={homeLabel} className="site-header__brand">
      {inner}
    </Link>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__location-chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteHeader({
  active,
  navCurrent = true,
  home,
  showSignIn = true,
}: Props) {
  const items = buildNav(home);
  const router = useRouter();
  const session = useSession();
  const { lang, setLang, t } = useUiLocale();
  const signedInName = session.user?.fullName ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [cityMenu, setCityMenu] = useState<'desktop' | 'drawer' | null>(null);
  const menuId = useId();
  const cityMenuId = useId();
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_CITY_STORAGE_KEY);
    if (stored && QATAR_PLACES.some((place) => place.value === stored)) {
      setSelectedCity(stored);
    }
  }, []);

  useEffect(() => {
    if (cityMenu !== 'desktop') return;
    const onPointer = (event: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setCityMenu(null);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [cityMenu]);

  useEffect(() => {
    if (cityMenu !== 'desktop') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCityMenu(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cityMenu]);

  function handleLangToggle(): void {
    setLang(lang === 'en' ? 'ar' : 'en');
  }

  function handleCitySelect(value: string): void {
    setSelectedCity(value);
    window.localStorage.setItem(UI_CITY_STORAGE_KEY, value);
    setCityMenu(null);
    setMenuOpen(false);
    router.push(browseHrefForPlace(value));
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setCityMenu(null);
  }, [active, home]);

  function navClass(itemId: string, hasDot?: boolean): string {
    const on = isNavActive(itemId, active);
    return ['site-header__link', hasDot ? 'site-header__link--live' : '', on ? 'is-active' : ''].filter(Boolean).join(' ');
  }

  function renderNavItem(item: NavItem, onNavigate?: () => void) {
    const on = isNavActive(item.id, active);
    const cur = on && navCurrent ? ('page' as const) : undefined;
    const children = (
      <>
        {item.dot ? <span className="live-dot site-header__live-dot" aria-hidden="true" /> : null}
        {t(item.labelKey)}
      </>
    );
    if (item.href.startsWith('#')) {
      return (
        <a
          key={item.id}
          className={navClass(item.id, item.dot)}
          href={item.href}
          aria-current={cur}
          onClick={onNavigate}
        >
          {children}
        </a>
      );
    }
    return (
      <Link key={item.id} className={navClass(item.id, item.dot)} href={item.href} aria-current={cur} onClick={onNavigate}>
        {children}
      </Link>
    );
  }

  async function handleSignOut(): Promise<void> {
    setMenuOpen(false);
    await session.logout();
  }

  const authButton =
    showSignIn && signedInName ? (
      <button type="button" className="site-header__action site-header__auth-btn site-header__signout" onClick={() => void handleSignOut()}>
        {t('header.signOut')}
      </button>
    ) : showSignIn ? (
      <Link href="/signin" className="site-header__action site-header__action--solid site-header__auth-btn">
        {t('header.login')}
      </Link>
    ) : null;

  const desktopAuthSignedOut = showSignIn ? (
    <>
      <Link href="/signin?mode=up" className="site-header__action site-header__action--register site-header__auth-btn">
        {t('header.register')}
      </Link>
      <Link href="/signin" className="site-header__action site-header__action--solid site-header__auth-btn">
        {t('header.login')}
      </Link>
    </>
  ) : null;

  const desktopAccount = showSignIn ? (
    signedInName ? (
      <>
        <Link href="/account" className="site-header__action site-header__action--quiet">
          {t('header.account')}
        </Link>
        {session.capabilities.length > 0 ? (
          <Link href="/admin" className="site-header__action site-header__action--quiet">
            {t('header.admin')}
          </Link>
        ) : null}
        <span className="site-header__user">{signedInName}</span>
        <button type="button" className="site-header__action site-header__auth-btn site-header__signout" onClick={() => void handleSignOut()}>
          {t('header.signOut')}
        </button>
      </>
    ) : (
      desktopAuthSignedOut
    )
  ) : null;

  const drawerAccount =
    showSignIn && signedInName ? (
      <>
        <Link href="/account" className="site-header__action" onClick={() => setMenuOpen(false)}>
          {t('header.account')}
        </Link>
        {session.capabilities.length > 0 ? (
          <Link href="/admin" className="site-header__action" onClick={() => setMenuOpen(false)}>
            {t('header.admin')}
          </Link>
        ) : null}
        <span className="site-header__user">{signedInName}</span>
        <button type="button" className="site-header__action site-header__signout" onClick={() => void handleSignOut()}>
          {t('header.signOut')}
        </button>
      </>
    ) : showSignIn ? (
      <>
        <Link href="/signin?mode=up" className="site-header__action site-header__action--register" onClick={() => setMenuOpen(false)}>
          {t('header.register')}
        </Link>
        <Link href="/signin" className="site-header__action site-header__action--solid" onClick={() => setMenuOpen(false)}>
          {t('header.login')}
        </Link>
      </>
    ) : null;

  function renderLocationControl(variant: 'desktop' | 'drawer') {
    const open = cityMenu === variant;
    const panelClass =
      variant === 'desktop' ? 'site-header__location-panel' : 'site-header__location-panel site-header__location-panel--drawer';
    return (
      <div className="site-header__location-wrap" ref={variant === 'desktop' ? cityRef : undefined}>
        <button
          type="button"
          className="site-header__pill site-header__location"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? cityMenuId : undefined}
          onClick={() => setCityMenu((current) => (current === variant ? null : variant))}
        >
          <GlobeIcon />
          <span className="site-header__location-label">{placeLabel(selectedCity)}</span>
          <ChevronIcon />
        </button>
        {open ? (
          <div id={cityMenuId} className={panelClass} role="listbox" aria-label={t('header.selectCity')}>
            {QATAR_PLACES.map((place) => (
              <button
                key={place.value}
                type="button"
                role="option"
                aria-selected={place.value === selectedCity}
                className={
                  place.value === selectedCity
                    ? 'site-header__location-option is-selected'
                    : 'site-header__location-option'
                }
                onClick={() => handleCitySelect(place.value)}
              >
                {place.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderLangControl() {
    return (
      <button
        type="button"
        onClick={handleLangToggle}
        aria-label={t('header.switchLanguage')}
        className="site-header__pill site-header__lang"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
          <path
            d="M5 6h6.2L8.2 18H5.8L5 6zM14.5 9.5c1.6 0 2.8 1.1 2.8 2.6 0 1.8-1.4 2.9-3.5 2.9h-.6v1.5h-1.8V9.5h2.1zm-.3 1.6h-.8v2.3h.7c.9 0 1.4-.4 1.4-1.1 0-.7-.5-1.2-1.3-1.2z"
            fill="currentColor"
          />
          <path d="M18 6v2h-2v1.2H18V11h1.2V8h2V6.8h-2V6H18z" fill="currentColor" />
        </svg>
        <span className="site-header__lang-text">
          <span className="site-header__lang-primary">{t('header.langName')}</span>
          <span className="site-header__lang-code" aria-hidden="true">{t('header.langCode')}</span>
        </span>
      </button>
    );
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandMark home={home} homeLabel={t('header.brandHome')} />

        <nav aria-label={t('header.mainNav')} className="site-header__nav site-header__nav--desktop">
          {items.map((item) => renderNavItem(item))}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__utilities site-header__utilities--desktop">
            <Link href="/browse" className="site-header__icon-btn" aria-label={t('header.search')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
            {renderLocationControl('desktop')}
            {renderLangControl()}
          </div>
          <div className="site-header__actions-desktop">{desktopAccount}</div>
          <div className="site-header__actions-mobile">{authButton}</div>
          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={menuOpen ? 'site-header__burger is-open' : 'site-header__burger'} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="site-header__overlay is-open">
          <button type="button" className="site-header__backdrop" aria-label={t('header.closeMenu')} onClick={() => setMenuOpen(false)} />
          <div id={menuId} className="site-header__drawer" role="dialog" aria-modal="true" aria-label={t('header.siteMenu')}>
            <div className="site-header__drawer-head">
              <span style={css('font-weight: 800; font-size: 15px; color: #15191E')}>{t('header.menu')}</span>
              <button type="button" className="site-header__drawer-close" aria-label={t('header.closeMenu')} onClick={() => setMenuOpen(false)}>
                ✕
              </button>
            </div>
            <nav aria-label={t('header.mobileNav')} className="site-header__drawer-nav">
              {items.map((item) => renderNavItem(item, () => setMenuOpen(false)))}
            </nav>
            <div className="site-header__drawer-utilities">
              {renderLocationControl('drawer')}
              {renderLangControl()}
            </div>
            {drawerAccount ? <div className="site-header__drawer-foot">{drawerAccount}</div> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
