'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { css } from '../lib/css';
import { useSession } from '../lib/session';

const UI_LANG_STORAGE_KEY = 'araq-ui-lang';

type UiLang = 'en' | 'ar';

function inferUiLangFromLabel(label: string): UiLang {
  if (/عرب|العربية|^AR$/i.test(label.trim())) return 'ar';
  return 'en';
}

const NAV = [
  { id: 'men', label: 'Men', href: '/browse?audience=men' },
  { id: 'women', label: 'Women', href: '/browse?audience=women' },
  { id: 'categories', label: 'Categories', href: '/categories' },
  { id: 'auctions', label: 'Live auctions', href: '/auctions', dot: true },
  { id: 'buy', label: 'Buy', href: '/browse' },
];

type Props = {
  active?: string;
  navCurrent?: boolean;
  home?: boolean;
  langLabel?: string;
  toggleLang?: () => void;
  showSignIn?: boolean;
};

function BrandMark({ home }: { home?: boolean }) {
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
      <a href="#top" aria-label="Araq & Kahraman Auctions home" className="site-header__brand">
        {inner}
      </a>
    );
  }
  return (
    <Link href="/" aria-label="Araq & Kahraman Auctions home" className="site-header__brand">
      {inner}
    </Link>
  );
}

export default function SiteHeader({
  active,
  navCurrent = true,
  home,
  langLabel,
  toggleLang,
  showSignIn = true,
}: Props) {
  const items = home
    ? [...NAV, { id: 'how', label: 'How it works', href: '#how' }]
    : [...NAV, { id: 'help', label: 'Help', href: '/help' }];

  const session = useSession();
  const signedInName = session.user?.fullName ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiLang, setUiLang] = useState<UiLang>('en');
  const menuId = useId();

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') {
      setUiLang(stored);
      return;
    }
    if (langLabel) {
      setUiLang(inferUiLangFromLabel(langLabel));
    }
  }, [langLabel]);

  function handleLangToggle(): void {
    setUiLang((prev) => {
      const next: UiLang = prev === 'en' ? 'ar' : 'en';
      window.localStorage.setItem(UI_LANG_STORAGE_KEY, next);
      return next;
    });
    toggleLang?.();
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
  }, [active, home]);

  function navClass(itemId: string, hasDot?: boolean): string {
    const on = itemId === active;
    return ['site-header__link', hasDot ? 'site-header__link--live' : '', on ? 'is-active' : ''].filter(Boolean).join(' ');
  }

  function renderNavItem(item: (typeof items)[number], onNavigate?: () => void) {
    const on = item.id === active;
    const cur = on && navCurrent ? ('page' as const) : undefined;
    const children = (
      <>
        {item.dot ? <span className="live-dot site-header__live-dot" aria-hidden="true" /> : null}
        {item.label}
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
        Sign out
      </button>
    ) : showSignIn ? (
      <Link href="/signin" className="site-header__action site-header__action--primary site-header__auth-btn">
        Sign in
      </Link>
    ) : null;

  const desktopAuthSignedOut = showSignIn ? (
    <>
      <Link href="/signin?mode=up" className="site-header__action site-header__action--register site-header__auth-btn">
        Register
      </Link>
      <Link href="/signin" className="site-header__action site-header__action--solid site-header__auth-btn">
        Sign in
      </Link>
    </>
  ) : null;

  const desktopAccount = showSignIn ? (
    signedInName ? (
      <>
        <Link href="/account" className="site-header__action site-header__action--quiet">
          Account
        </Link>
        {session.capabilities.length > 0 ? (
          <Link href="/admin" className="site-header__action site-header__action--quiet">
            Admin
          </Link>
        ) : null}
        <span className="site-header__user">{signedInName}</span>
        <button type="button" className="site-header__action site-header__auth-btn site-header__signout" onClick={() => void handleSignOut()}>
          Sign out
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
          Account
        </Link>
        {session.capabilities.length > 0 ? (
          <Link href="/admin" className="site-header__action" onClick={() => setMenuOpen(false)}>
            Admin
          </Link>
        ) : null}
        <span className="site-header__user">{signedInName}</span>
      </>
    ) : null;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandMark home={home} />

        <nav aria-label="Main" className="site-header__nav site-header__nav--desktop">
          {items.map((item) => renderNavItem(item))}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__utilities site-header__utilities--desktop">
            <Link href="/browse" className="site-header__icon-btn" aria-label="Search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
            <span className="site-header__pill site-header__location">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__pill-icon">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>
              Qatar
            </span>
            <button
              type="button"
              onClick={handleLangToggle}
              aria-label="Switch language"
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
                <span className="site-header__lang-primary">{uiLang === 'en' ? 'English' : 'العربية'}</span>
                <span className="site-header__lang-code" aria-hidden="true">{uiLang === 'en' ? 'EN' : 'AR'}</span>
              </span>
            </button>
          </div>
          <div className="site-header__actions-desktop">{desktopAccount}</div>
          <div className="site-header__actions-mobile">{authButton}</div>
          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
          <button type="button" className="site-header__backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div id={menuId} className="site-header__drawer" role="dialog" aria-modal="true" aria-label="Site menu">
            <div className="site-header__drawer-head">
              <span style={css('font-weight: 800; font-size: 15px; color: #15191E')}>Menu</span>
              <button type="button" className="site-header__drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                ✕
              </button>
            </div>
            <nav aria-label="Mobile" className="site-header__drawer-nav">
              {items.map((item) => renderNavItem(item, () => setMenuOpen(false)))}
            </nav>
            {drawerAccount ? <div className="site-header__drawer-foot">{drawerAccount}</div> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
