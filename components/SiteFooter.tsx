import Link from 'next/link';
import { css } from '../lib/css';

const COL = 'flex: 1 1 140px; display: flex; flex-direction: column; gap: 10px; font-size: 15px';
const COL_HEAD = 'color: #FFFFFF; font-weight: 600; margin-bottom: 4px';
const APP_LINK = 'height: 44px; padding: 0 16px; border: 1px solid #403A31; border-radius: 10px; display: flex; align-items: center; font-size: 14px; font-weight: 600';

type Props = {
  /* /signin uses a reduced footer with no brand block or nav columns */
  minimal?: boolean;
  /* only the homepage shows the iOS/Android app buttons */
  apps?: boolean;
  /* /help and /about point these at their on-page sections */
  safetyHref?: string;
  careersHref?: string;
};

export default function SiteFooter({ minimal, apps, safetyHref = '/help', careersHref = '/about' }: Props) {
  if (minimal) {
    return (
      <footer className="foot" style={css('background: #15191E; color: #C9CFCB')}>
        <div style={css('max-width: 1240px; margin: 0 auto; padding: 24px 24px 28px; font-size: 14px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px')}>
          <span>© 2026 Araq &amp; Kahraman Auctions. All rights reserved.</span>
          <span style={css('display: flex; gap: 18px; flex-wrap: wrap')}>
            <Link href="/help">Help</Link>
            <Link href="/legal">Terms</Link>
            <Link href="/legal">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="foot" style={css('background: #15191E; color: #C9CFCB')}>
      <div style={css('max-width: 1240px; margin: 0 auto; padding: 56px 24px 32px; display: flex; flex-wrap: wrap; gap: 40px 64px')}>
        <div style={css('flex: 2 1 260px; min-width: 0')}>
          <div style={css('display: flex; align-items: center; gap: 14px')}>
            <img src="/logo.png" alt="" width={64} height={64} style={css('width: 64px; height: 64px; object-fit: contain; display: block')} />
            <div style={css("font-family: 'Schibsted Grotesk', sans-serif; font-weight: 800; font-size: 20px; color: #FFFFFF; letter-spacing: 0.01em; line-height: 1.15")}>
              ARAQ &amp; KAHRAMAN
              <span style={css('display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.32em; color: #D4A84B')}>AUCTIONS</span>
            </div>
          </div>
          <p style={css('margin: 10px 0 20px; max-width: 34ch; font-size: 15px')}>The simple way to buy, sell and bid on almost anything.</p>
          {apps && (
            <div style={css('display: flex; gap: 10px; flex-wrap: wrap')}>
              <a href="#app" style={css(APP_LINK)}>Get the iOS app</a>
              <a href="#app" style={css(APP_LINK)}>Get the Android app</a>
            </div>
          )}
        </div>
        <nav aria-label="Marketplace" style={css(COL)}>
          <span style={css(COL_HEAD)}>Marketplace</span>
          <Link href="/categories">All categories</Link>
          <Link href="/auctions">Live auctions</Link>
          <Link href="/browse">Latest ads</Link>
          <Link href="/post">Post an ad</Link>
        </nav>
        <nav aria-label="Company" style={css(COL)}>
          <span style={css(COL_HEAD)}>Company</span>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          {careersHref.startsWith('#') ? <a href={careersHref}>Careers</a> : <Link href={careersHref}>Careers</Link>}
        </nav>
        <nav aria-label="Help" style={css(COL)}>
          <span style={css(COL_HEAD)}>Help</span>
          <Link href="/help">Help centre</Link>
          {safetyHref.startsWith('#') ? <a href={safetyHref}>Safety tips</a> : <Link href={safetyHref}>Safety tips</Link>}
          <Link href="/legal">Terms</Link>
          <Link href="/legal">Privacy</Link>
        </nav>
      </div>
      <div style={css('max-width: 1240px; margin: 0 auto; padding: 20px 24px 32px; border-top: 1px solid #2F2A23; font-size: 14px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px')}>
        <span>© 2026 Araq &amp; Kahraman Auctions. All rights reserved.</span>
        <span>English · العربية</span>
      </div>
    </footer>
  );
}
