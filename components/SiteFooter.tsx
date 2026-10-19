'use client';

import Link from 'next/link';
import { css } from '../lib/css';
import { useUiLocale } from '../lib/UiLocaleProvider';

const COL = 'flex: 1 1 140px; display: flex; flex-direction: column; gap: 10px; font-size: 15px';
const COL_HEAD = 'color: #FFFFFF; font-weight: 600; margin-bottom: 4px';

type Props = {
  /* /signin uses a reduced footer with no brand block or nav columns */
  minimal?: boolean;
  /* /help and /about point these at their on-page sections */
  safetyHref?: string;
  careersHref?: string;
};

export default function SiteFooter({ minimal, safetyHref = '/help', careersHref = '/about' }: Props) {
  const { t } = useUiLocale();
  if (minimal) {
    return (
      <footer className="foot" style={css('background: #15191E; color: #C9CFCB')}>
        <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 24px var(--mkt-gutter-x) 28px; font-size: 14px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px')}>
          <span>{t('footer.rights')}</span>
          <span style={css('display: flex; gap: 18px; flex-wrap: wrap')}>
            <Link href="/help">{t('footer.help')}</Link>
            <Link href="/legal">{t('footer.terms')}</Link>
            <Link href="/legal">{t('footer.privacy')}</Link>
            <Link href="/contact">{t('footer.contact')}</Link>
          </span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="foot" style={css('background: #15191E; color: #C9CFCB')}>
      <div className="site-footer__grid" style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 56px var(--mkt-gutter-x) 32px; display: flex; flex-wrap: wrap; gap: 40px 64px')}>
        <div style={css('flex: 2 1 260px; min-width: 0')}>
          <div style={css('display: flex; align-items: center; gap: 14px')}>
            <img src="/logo.png" alt="" width={64} height={64} style={css('width: 64px; height: 64px; object-fit: contain; display: block')} />
            <div style={css("font-family: 'Schibsted Grotesk', sans-serif; font-weight: 800; font-size: 20px; color: #FFFFFF; letter-spacing: 0.01em; line-height: 1.15")}>
              ARAQ &amp; KAHRAMAN
              <span style={css('display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.32em; color: #D4A84B')}>AUCTIONS</span>
            </div>
          </div>
          <p style={css('margin: 10px 0 0; max-width: 34ch; font-size: 15px')}>{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.marketplace')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.marketplace')}</span>
          <Link href="/categories">{t('footer.allCategories')}</Link>
          <Link href="/auctions">{t('footer.liveAuctions')}</Link>
          <Link href="/browse">{t('footer.latestAds')}</Link>
        </nav>
        <nav aria-label={t('footer.company')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.company')}</span>
          <Link href="/about">{t('footer.about')}</Link>
          <Link href="/contact">{t('footer.contact')}</Link>
          {careersHref.startsWith('#') ? <a href={careersHref}>{t('footer.careers')}</a> : <Link href={careersHref}>{t('footer.careers')}</Link>}
        </nav>
        <nav aria-label={t('footer.help')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.help')}</span>
          <Link href="/help">{t('footer.helpCentre')}</Link>
          {safetyHref.startsWith('#') ? <a href={safetyHref}>{t('footer.safetyTips')}</a> : <Link href={safetyHref}>{t('footer.safetyTips')}</Link>}
          <Link href="/legal">{t('footer.terms')}</Link>
          <Link href="/legal">{t('footer.privacy')}</Link>
        </nav>
      </div>
      <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 20px var(--mkt-gutter-x) 32px; border-top: 1px solid #2F2A23; font-size: 14px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px')}>
        <span>{t('footer.rights')}</span>
        <span>{t('footer.languages')}</span>
      </div>
    </footer>
  );
}
