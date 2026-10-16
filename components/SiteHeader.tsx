'use client';

import Link from 'next/link';
import { css } from '../lib/css';
import { useSession } from '../lib/session';

const NAV = [
  { id: 'men', label: 'Men', href: '/browse?audience=men' },
  { id: 'women', label: 'Women', href: '/browse?audience=women' },
  { id: 'categories', label: 'Categories', href: '/categories' },
  { id: 'auctions', label: 'Live auctions', href: '/auctions', dot: true },
  { id: 'buy', label: 'Buy', href: '/browse' },
  { id: 'sell', label: 'Sell', href: '/post' },
];

const LANG_BTN =
  'height: 44px; padding: 0 14px; border: 1px solid #E6E4DF; background: #FFFFFF; border-radius: 10px; font: inherit; font-size: 14px; font-weight: 600; color: #2A3036; cursor: pointer';
const SIGN_IN =
  'height: 44px; padding: 0 16px; border-radius: 10px; display: flex; align-items: center; font-weight: 600; font-size: 15px; color: #15191E';
const POST_AD =
  'height: 44px; padding: 0 18px; border-radius: 10px; display: flex; align-items: center; gap: 8px; background: #9A6B12; color: #FFFFFF; font-weight: 600; font-size: 15px';
const DOT_LINK = 'display: flex; align-items: center; gap: 8px';
const ACTIVE = 'color: #9A6B12; font-weight: 700';

type Props = {
  /* id of the nav item to highlight; omit when the page has no highlighted item */
  active?: string;
  /* Product pages tint the section link without claiming it as the current page */
  navCurrent?: boolean;
  /* the homepage's nav ends with "How it works" and links back to #top */
  home?: boolean;
  /*
   * Interface translation is not implemented. The button is only rendered when a page actually
   * supplies a toggle, so no page shows a language control that does nothing (Phase 05 removed
   * the cosmetic toggle from the pages it rebuilt; the remaining pages are unchanged for now).
   */
  langLabel?: string;
  toggleLang?: () => void;
  /* Post an ad is hidden on /post, and both links are hidden on /signin */
  showSignIn?: boolean;
  showPostAd?: boolean;
};

export default function SiteHeader({
  active,
  navCurrent = true,
  home,
  langLabel,
  toggleLang,
  showSignIn = true,
  showPostAd = true,
}: Props) {
  const items = home
    ? [...NAV, { id: 'how', label: 'How it works', href: '#how' }]
    : [...NAV, { id: 'help', label: 'Help', href: '/help' }];

  const session = useSession();
  const signedInName = session.user?.fullName ?? null;

  return (
    <header style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF; position: relative; z-index: 2')}>
      <div style={css('max-width: 1240px; margin: 0 auto; padding: 14px 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px 28px')}>
        {home ? (
          <a href="#top" aria-label="Araq & Kahraman Auctions home" style={css('display: flex; align-items: center; gap: 12px; color: #15191E')}>
            <img src="/logo.png" alt="" width={52} height={52} style={css('width: 52px; height: 52px; object-fit: contain; display: block')} />
            <span style={css('display: flex; flex-direction: column; line-height: 1.05')}>
              <span style={css("font-family: 'Schibsted Grotesk', sans-serif; font-weight: 800; font-size: 19px; letter-spacing: 0.01em")}>ARAQ &amp; KAHRAMAN</span>
              <span style={css('font-size: 11px; font-weight: 600; letter-spacing: 0.32em; color: #9A6B12')}>AUCTIONS</span>
            </span>
          </a>
        ) : (
          <Link href="/" aria-label="Araq & Kahraman Auctions home" style={css('display: flex; align-items: center; gap: 12px; color: #15191E')}>
            <img src="/logo.png" alt="" width={52} height={52} style={css('width: 52px; height: 52px; object-fit: contain; display: block')} />
            <span style={css('display: flex; flex-direction: column; line-height: 1.05')}>
              <span style={css("font-family: 'Schibsted Grotesk', sans-serif; font-weight: 800; font-size: 19px; letter-spacing: 0.01em")}>ARAQ &amp; KAHRAMAN</span>
              <span style={css('font-size: 11px; font-weight: 600; letter-spacing: 0.32em; color: #9A6B12')}>AUCTIONS</span>
            </span>
          </Link>
        )}
        <nav aria-label="Main" style={css('display: flex; flex-wrap: wrap; align-items: center; gap: 4px 22px; flex: 1 1 auto; font-size: 15px')}>
          {items.map((item) => {
            const on = item.id === active;
            const style = css(item.dot ? (on ? `${DOT_LINK}; ${ACTIVE}` : DOT_LINK) : on ? ACTIVE : '');
            const children = (
              <>
                {item.dot && <span className="live-dot" style={css('width: 8px; height: 8px; border-radius: 50%; background: #C2410C')}></span>}
                {item.label}
              </>
            );
            const cur = on && navCurrent ? 'page' : undefined;
            return item.href.startsWith('#') ? (
              <a key={item.id} className="navlink" href={item.href} style={style} aria-current={cur}>{children}</a>
            ) : (
              <Link key={item.id} className="navlink" href={item.href} style={style} aria-current={cur}>{children}</Link>
            );
          })}
        </nav>
        <div style={css('display: flex; align-items: center; gap: 10px; flex-wrap: wrap')}>
          {toggleLang && langLabel && (
            <button type="button" onClick={toggleLang} aria-label="Switch language" className="btn-ghost" style={css(LANG_BTN)}>{langLabel}</button>
          )}
          {/* The session decides this, not the page: a signed-in visitor never sees "Sign in". */}
          {showSignIn &&
            (signedInName ? (
              <>
                <Link href="/account" className="btn-ghost" style={css(SIGN_IN)}>Account</Link>
                {session.capabilities.length > 0 ? (
                  <Link href="/admin" className="btn-ghost" style={css(SIGN_IN)}>Admin</Link>
                ) : null}
                <span style={css('font-size: 14px; color: #5B636B')}>{signedInName}</span>
              </>
            ) : (
              // While the session is still being checked the header keeps its default, so the
              // static markup matches the signed-out design instead of flashing an empty slot.
              <Link href="/signin" className="btn-ghost" style={css(SIGN_IN)}>Sign in</Link>
            ))}
          {showPostAd && (
            <Link href="/post" className="btn-primary" style={css(POST_AD)}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14 M5 12h14"></path></svg>
              Post an ad
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
