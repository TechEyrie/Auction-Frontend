'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { css } from '../lib/css';
import { useSession } from '../lib/session';

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
  const menuId = useId();

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

  const desktopAccount = showSignIn ? (
    signedInName ? (
      <>
        <Link href="/account" className="site-header__action">
          Account
        </Link>
        {session.capabilities.length > 0 ? (
          <Link href="/admin" className="site-header__action">
            Admin
          </Link>
        ) : null}
        <span className="site-header__user">{signedInName}</span>
        {authButton}
      </>
    ) : (
      authButton
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
          {toggleLang && langLabel ? (
            <button type="button" onClick={toggleLang} aria-label="Switch language" className="site-header__action site-header__lang">
              {langLabel}
            </button>
          ) : null}
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
