'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { css } from '../lib/css';
import { apiFetch } from '../lib/api';
import { applyBrowseChange, browseQuery, parseBrowseState } from '../lib/listings';
import { listingsQueryForPlace, placeToBrowsePatch } from '../lib/qatarPlaces';
import { useSession } from '../lib/session';
import {
  catalogPlaceOptionKey,
  parseCatalogPlaceOptionKey,
  readStoredPlace,
  writeStoredPlace,
} from '../lib/uiPlace';
import { useAsync } from '../lib/useAsync';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';
import { chromeTranslate, useSiteChromeBody } from '../lib/siteChrome';
import { HeaderSearchDrawerTrigger, HeaderSearchOverlay } from './HeaderSearchOverlay';

const ALL_QATAR_PLACE_KEY = '';
const HEADER_FLOAT_SCROLL_THRESHOLD = 16;

const LANGUAGE_OPTIONS: ReadonlyArray<{ id: 'en' | 'ar'; label: string; code: string }> = [
  { id: 'en', label: 'English', code: 'EN' },
  { id: 'ar', label: 'العربية', code: 'AR' },
];

type CatalogLocation = { key: string; cityKey: string; areaKey: string | null; label: string };

const HOVER_CLOSE_DELAY_MS = 150;

type MenuLinkId =
  | 'liveAuctions'
  | 'auctionCalendar'
  | 'auctionListings'
  | 'howBidding'
  | 'browseAccessories'
  | 'allCategories'
  | 'forMen'
  | 'forWomen'
  | 'forUnisex'
  | 'contactToSell'
  | 'aboutUs'
  | 'auctionProcess'
  | 'helpCentre'
  | 'contact'
  | 'allListings'
  | 'fixedPrice'
  | 'auctions'
  | 'categories';

type MenuIconName =
  | 'live'
  | 'list'
  | 'gavel'
  | 'search'
  | 'grid'
  | 'user'
  | 'users'
  | 'mail'
  | 'info'
  | 'steps'
  | 'help'
  | 'tag'
  | 'folder';

type MenuLink = {
  id: MenuLinkId;
  href: string;
  icon: MenuIconName;
};

/** Compile-time check that every menu link id has EN/AR title + description keys. */
function menuKeys(id: MenuLinkId): { title: MessageKey; desc: MessageKey } {
  const title: `nav.menu.${MenuLinkId}.title` = `nav.menu.${id}.title`;
  const desc: `nav.menu.${MenuLinkId}.desc` = `nav.menu.${id}.desc`;
  return { title, desc };
}

type NavItem = {
  id: string;
  labelKey: MessageKey;
  dot?: boolean;
  links: MenuLink[];
};

function buildNav(home?: boolean): NavItem[] {
  const how = home ? '#how' : '/#how';
  return [
    {
      id: 'auction',
      labelKey: 'nav.auction',
      dot: true,
      links: [
        { id: 'liveAuctions', href: '/auctions', icon: 'live' },
        { id: 'auctionCalendar', href: '/auction-calendar', icon: 'list' },
        { id: 'auctionListings', href: '/browse?method=auction', icon: 'list' },
        { id: 'howBidding', href: how, icon: 'gavel' },
      ],
    },
    {
      id: 'accessories',
      labelKey: 'nav.accessories',
      links: [
        { id: 'browseAccessories', href: '/browse?q=accessories', icon: 'search' },
        { id: 'forMen', href: '/browse?audience=men', icon: 'user' },
        { id: 'forWomen', href: '/browse?audience=women', icon: 'users' },
        { id: 'forUnisex', href: '/browse?audience=unisex', icon: 'users' },
      ],
    },
    {
      id: 'sell',
      labelKey: 'nav.sell',
      links: [
        { id: 'contactToSell', href: '/contact', icon: 'mail' },
        { id: 'aboutUs', href: '/about', icon: 'info' },
      ],
    },
    {
      id: 'how',
      labelKey: 'nav.how',
      links: [
        { id: 'auctionProcess', href: how, icon: 'steps' },
        { id: 'helpCentre', href: '/help', icon: 'help' },
        { id: 'contact', href: '/contact', icon: 'mail' },
      ],
    },
    {
      id: 'shop',
      labelKey: 'nav.shop',
      links: [
        { id: 'allListings', href: '/browse', icon: 'list' },
        { id: 'fixedPrice', href: '/browse?method=fixed_price', icon: 'tag' },
        { id: 'auctions', href: '/browse?method=auction', icon: 'live' },
        { id: 'categories', href: '/categories', icon: 'folder' },
      ],
    },
  ];
}

function MenuIcon({ name }: { name: MenuIconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'site-header__menu-icon-svg',
  };
  switch (name) {
    case 'live':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case 'gavel':
      return (
        <svg {...common}>
          <path d="M14 4l6 6M11 7l6 6M5 19l7-7M3 21h9M13.5 2.5l-5 5 6 6 5-5" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.2a6.5 6.5 0 0 1 4 5.8" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case 'steps':
      return (
        <svg {...common}>
          <path d="M4 18h5v-5h5V8h6M4 18v2M9 13v2M14 8v2" />
        </svg>
      );
    case 'help':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
  }
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

function BrandMark({
  home,
  homeLabel,
  brandName,
  brandSub,
}: {
  home?: boolean;
  homeLabel: string;
  brandName: string;
  brandSub: string;
}) {
  const inner = (
    <>
      <img src="/logo.png" alt="" width={44} height={44} className="site-header__logo" />
      <span className="site-header__brand-text">
        <span className="site-header__brand-name">{brandName}</span>
        <span className="site-header__brand-sub">{brandSub}</span>
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

function NavChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="site-header__chevron">
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
  const pathname = usePathname();
  const session = useSession();
  const { lang, setLang, t: baseT } = useUiLocale();
  const headerChrome = useSiteChromeBody('header');
  const authChrome = useSiteChromeBody('auth');
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      chromeTranslate(lang, baseT, key.startsWith('auth.') ? authChrome : headerChrome, key, vars),
    [lang, baseT, headerChrome, authChrome],
  );
  const signedInName = session.user?.fullName ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerFloating, setHeaderFloating] = useState(false);
  const [selectedPlaceKey, setSelectedPlaceKey] = useState(ALL_QATAR_PLACE_KEY);
  const [cityMenu, setCityMenu] = useState<'desktop' | 'drawer' | null>(null);
  const [langMenu, setLangMenu] = useState<'desktop' | 'drawer' | null>(null);
  const catalogLocations = useAsync<{ locations: CatalogLocation[] }>(
    () => apiFetch<{ locations: CatalogLocation[] }>('/api/catalog/locations?country=QA', { cache: 'no-store' }),
    [],
  );
  const menuId = useId();
  const cityMenuId = useId();
  const langMenuId = useId();
  const cityRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [openNav, setOpenNav] = useState<string | null>(null);
  const [navAlign, setNavAlign] = useState<'start' | 'end'>('start');
  const [drawerSection, setDrawerSection] = useState<string | null>(null);
  const openedBy = useRef<'hover' | 'click' | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFirst = useRef(false);

  function clearCloseTimer(): void {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function closeNav(): void {
    clearCloseTimer();
    openedBy.current = null;
    setOpenNav(null);
  }

  useEffect(() => clearCloseTimer, []);

  // Pick left/right alignment from available space so panels never clip off-screen.
  useLayoutEffect(() => {
    if (!openNav || !navRef.current) return;
    const wrap = navRef.current.querySelector<HTMLElement>(`[data-nav-id="${openNav}"]`);
    const menu = wrap?.querySelector<HTMLElement>('.site-header__menu');
    if (!wrap || !menu) return;
    const margin = 8;
    const rect = wrap.getBoundingClientRect();
    const width = menu.offsetWidth;
    const rtl = document.documentElement.dir === 'rtl';
    const startEdgeFits = rtl ? rect.right - width >= margin : rect.left + width <= window.innerWidth - margin;
    setNavAlign(startEdgeFits ? 'start' : 'end');
    if (focusFirst.current) {
      focusFirst.current = false;
      menu.querySelector<HTMLElement>('a')?.focus();
    }
  }, [openNav]);

  useEffect(() => {
    if (!openNav) return;
    const onPointer = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) closeNav();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const wrap = navRef.current?.querySelector<HTMLElement>(`[data-nav-id="${openNav}"]`);
      const hadFocus = wrap?.contains(document.activeElement) ?? false;
      closeNav();
      if (hadFocus) wrap?.querySelector<HTMLElement>('.site-header__trigger')?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [openNav]);

  useEffect(() => {
    const stored = readStoredPlace();
    if (stored) setSelectedPlaceKey(catalogPlaceOptionKey(stored.cityKey, stored.areaKey || null));
  }, []);

  useEffect(() => {
    const syncFloating = () => {
      setHeaderFloating(window.scrollY > HEADER_FLOAT_SCROLL_THRESHOLD);
    };
    syncFloating();
    window.addEventListener('scroll', syncFloating, { passive: true });
    return () => window.removeEventListener('scroll', syncFloating);
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

  useEffect(() => {
    if (langMenu !== 'desktop') return;
    const onPointer = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangMenu(null);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [langMenu]);

  useEffect(() => {
    if (langMenu !== 'desktop') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLangMenu(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [langMenu]);

  function handleLangSelect(next: 'en' | 'ar'): void {
    setLangMenu(null);
    if (next !== lang) setLang(next);
  }

  function selectedPlaceLabel(): string {
    if (!selectedPlaceKey) return t('browse.allCities');
    const match = catalogLocations.data?.locations.find(
      (location) => catalogPlaceOptionKey(location.cityKey, location.areaKey) === selectedPlaceKey,
    );
    return match?.label ?? selectedPlaceKey;
  }

  function handleCitySelect(value: string): void {
    setSelectedPlaceKey(value);
    const stored = value ? parseCatalogPlaceOptionKey(value) : null;
    writeStoredPlace(stored);
    setCityMenu(null);
    setMenuOpen(false);
    const patch = placeToBrowsePatch(stored);
    if (pathname === '/browse') {
      const next = applyBrowseChange(parseBrowseState(new URLSearchParams(window.location.search)), patch);
      const qs = browseQuery(next);
      router.push(qs ? `/browse?${qs}` : '/browse');
      return;
    }
    const qs = listingsQueryForPlace(stored);
    router.push(qs ? `/browse?${qs}` : '/browse');
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
    setSearchOpen(false);
    setCityMenu(null);
    closeNav();
  }, [active, home]);

  function openSearchOverlay() {
    setSearchOpen(true);
  }

  function openSearchFromDrawer() {
    setMenuOpen(false);
    setSearchOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) setDrawerSection(null);
  }, [menuOpen]);

  function triggerClass(item: NavItem): string {
    const on = isNavActive(item.id, active);
    return [
      'site-header__trigger',
      item.dot ? 'site-header__link--live' : '',
      on ? 'is-active' : '',
      openNav === item.id ? 'is-open' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  function renderMenuLink(link: MenuLink, onNavigate: () => void) {
    const keys = menuKeys(link.id);
    const body = (
      <>
        <span className="site-header__menu-icon" aria-hidden="true">
          <MenuIcon name={link.icon} />
        </span>
        <span className="site-header__menu-text">
          <span className="site-header__menu-title">{t(keys.title)}</span>
          <span className="site-header__menu-desc">{t(keys.desc)}</span>
        </span>
      </>
    );
    if (link.href.startsWith('#')) {
      return (
        <a key={link.id} className="site-header__menu-link" href={link.href} onClick={onNavigate}>
          {body}
        </a>
      );
    }
    return (
      <Link key={link.id} className="site-header__menu-link" href={link.href} onClick={onNavigate}>
        {body}
      </Link>
    );
  }

  function renderTriggerLabel(item: NavItem) {
    return (
      <>
        {item.dot ? <span className="live-dot site-header__live-dot" aria-hidden="true" /> : null}
        {t(item.labelKey)}
        <NavChevron />
      </>
    );
  }

  function handleTriggerClick(item: NavItem, event: React.MouseEvent<HTMLButtonElement>): void {
    clearCloseTimer();
    if (openNav === item.id) {
      // A click right after hover-open keeps the menu open (pinned) instead of flashing closed.
      if (openedBy.current === 'hover') {
        openedBy.current = 'click';
        return;
      }
      closeNav();
      return;
    }
    openedBy.current = 'click';
    // detail === 0 means keyboard activation (Enter/Space): move focus into the panel.
    focusFirst.current = event.detail === 0;
    setOpenNav(item.id);
  }

  function handleTriggerKeyDown(item: NavItem, event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      clearCloseTimer();
      openedBy.current = 'click';
      focusFirst.current = true;
      if (openNav === item.id) {
        const menu = event.currentTarget.parentElement?.querySelector<HTMLElement>('.site-header__menu a');
        menu?.focus();
        focusFirst.current = false;
      } else {
        setOpenNav(item.id);
      }
    }
  }

  function handleItemPointerEnter(item: NavItem, event: React.PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    clearCloseTimer();
    if (openNav !== item.id) {
      openedBy.current = 'hover';
      setOpenNav(item.id);
    }
  }

  function handleItemPointerLeave(event: React.PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    clearCloseTimer();
    closeTimer.current = setTimeout(closeNav, HOVER_CLOSE_DELAY_MS);
  }

  function handleItemBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      clearCloseTimer();
      setOpenNav(null);
    }
  }

  function renderDesktopNavItem(item: NavItem) {
    const on = isNavActive(item.id, active);
    const open = openNav === item.id;
    const panelId = `${menuId}-nav-${item.id}`;
    return (
      <div
        key={item.id}
        className="site-header__nav-item"
        data-nav-id={item.id}
        onPointerEnter={(event) => handleItemPointerEnter(item, event)}
        onPointerLeave={handleItemPointerLeave}
        onBlur={handleItemBlur}
      >
        <button
          type="button"
          className={triggerClass(item)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={open ? panelId : undefined}
          aria-current={on && navCurrent ? 'true' : undefined}
          onClick={(event) => handleTriggerClick(item, event)}
          onKeyDown={(event) => handleTriggerKeyDown(item, event)}
        >
          {renderTriggerLabel(item)}
        </button>
        {open ? (
          <div
            id={panelId}
            className={navAlign === 'end' ? 'site-header__menu site-header__menu--end' : 'site-header__menu'}
            role="group"
            aria-label={t(item.labelKey)}
          >
            {item.links.map((link) => renderMenuLink(link, closeNav))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderDrawerNavItem(item: NavItem) {
    const on = isNavActive(item.id, active);
    const open = drawerSection === item.id;
    const panelId = `${menuId}-drawer-${item.id}`;
    return (
      <div key={item.id} className="site-header__drawer-section">
        <button
          type="button"
          className={[
            'site-header__trigger',
            'site-header__trigger--drawer',
            item.dot ? 'site-header__link--live' : '',
            on ? 'is-active' : '',
            open ? 'is-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setDrawerSection(open ? null : item.id)}
        >
          {renderTriggerLabel(item)}
        </button>
        {open ? (
          <div id={panelId} className="site-header__drawer-sub">
            {item.links.map((link) => renderMenuLink(link, () => setMenuOpen(false)))}
          </div>
        ) : null}
      </div>
    );
  }

  async function handleSignOut(): Promise<void> {
    setMenuOpen(false);
    await session.logout();
  }

  const authButton =
    showSignIn && signedInName ? (
      <button type="button" className="site-header__action site-header__auth-btn site-header__signout" onClick={() => void handleSignOut()}>
        {t('auth.signOut')}
      </button>
    ) : showSignIn ? (
      <Link href="/signin" className="site-header__action site-header__action--solid site-header__auth-btn">
        {t('auth.login')}
      </Link>
    ) : null;

  const desktopAuthSignedOut = showSignIn ? (
    <>
      <Link href="/signin?mode=up" className="site-header__action site-header__action--register site-header__auth-btn">
        {t('header.register')}
      </Link>
      <Link href="/signin" className="site-header__action site-header__action--solid site-header__auth-btn">
        {t('auth.login')}
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
          {t('auth.signOut')}
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
          {t('auth.signOut')}
        </button>
      </>
    ) : showSignIn ? (
      <>
        <Link href="/signin?mode=up" className="site-header__action site-header__action--register" onClick={() => setMenuOpen(false)}>
          {t('header.register')}
        </Link>
        <Link href="/signin" className="site-header__action site-header__action--solid" onClick={() => setMenuOpen(false)}>
          {t('auth.login')}
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
          onClick={() => {
            setLangMenu(null);
            setCityMenu((current) => (current === variant ? null : variant));
          }}
        >
          <GlobeIcon />
          <span className="site-header__location-label">{selectedPlaceLabel()}</span>
          <ChevronIcon />
        </button>
        {open ? (
          <div id={cityMenuId} className={panelClass} role="listbox" aria-label={t('header.selectCity')}>
            <button
              type="button"
              role="option"
              aria-selected={selectedPlaceKey === ALL_QATAR_PLACE_KEY}
              className={
                selectedPlaceKey === ALL_QATAR_PLACE_KEY
                  ? 'site-header__location-option is-selected'
                  : 'site-header__location-option'
              }
              onClick={() => handleCitySelect(ALL_QATAR_PLACE_KEY)}
            >
              {t('browse.allCities')}
            </button>
            {(catalogLocations.data?.locations ?? []).map((location) => {
              const optionKey = catalogPlaceOptionKey(location.cityKey, location.areaKey);
              return (
                <button
                  key={location.key}
                  type="button"
                  role="option"
                  aria-selected={optionKey === selectedPlaceKey}
                  className={
                    optionKey === selectedPlaceKey
                      ? 'site-header__location-option is-selected'
                      : 'site-header__location-option'
                  }
                  onClick={() => handleCitySelect(optionKey)}
                >
                  {location.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderLangControl(variant: 'desktop' | 'drawer') {
    const open = langMenu === variant;
    const panelClass =
      variant === 'desktop' ? 'site-header__location-panel' : 'site-header__location-panel site-header__location-panel--drawer';
    return (
      <div className="site-header__lang-wrap" ref={variant === 'desktop' ? langRef : undefined}>
        <button
          type="button"
          className="site-header__pill site-header__lang"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? langMenuId : undefined}
          aria-label={t('header.selectLanguage')}
          onClick={() => {
            setCityMenu(null);
            setLangMenu((current) => (current === variant ? null : variant));
          }}
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
          <ChevronIcon />
        </button>
        {open ? (
          <div id={langMenuId} className={panelClass} role="listbox" aria-label={t('header.selectLanguage')}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={lang === option.id}
                className={
                  lang === option.id ? 'site-header__location-option is-selected' : 'site-header__location-option'
                }
                onClick={() => handleLangSelect(option.id)}
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

  return (
    <header className={headerFloating ? 'site-header site-header--floating' : 'site-header'}>
      <div className="site-header__inner">
        <BrandMark
          home={home}
          homeLabel={t('header.brandHome')}
          brandName={t('header.brandName')}
          brandSub={t('header.brandSub')}
        />

        <nav ref={navRef} aria-label={t('header.mainNav')} className="site-header__nav site-header__nav--desktop">
          {items.map((item) => renderDesktopNavItem(item))}
        </nav>

        <div className="site-header__actions">
          <div className="site-header__utilities site-header__utilities--desktop">
            <button type="button" className="site-header__icon-btn" aria-label={t('header.search')} onClick={openSearchOverlay}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {renderLocationControl('desktop')}
            {renderLangControl('desktop')}
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
            <HeaderSearchDrawerTrigger onOpen={openSearchFromDrawer} />
            <nav aria-label={t('header.mobileNav')} className="site-header__drawer-nav">
              {items.map((item) => renderDrawerNavItem(item))}
            </nav>
            <div className="site-header__drawer-utilities">
              {renderLocationControl('drawer')}
              {renderLangControl('drawer')}
            </div>
            {drawerAccount ? <div className="site-header__drawer-foot">{drawerAccount}</div> : null}
          </div>
        </div>
      ) : null}

      <HeaderSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} chromeT={t} />
    </header>
  );
}
