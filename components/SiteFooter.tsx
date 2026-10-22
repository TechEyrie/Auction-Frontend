'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { css } from '../lib/css';
import { useUiLocale } from '../lib/UiLocaleProvider';
import type { MessageKey } from '../lib/uiMessages';
import { chromeTranslate, useSiteChromeBody } from '../lib/siteChrome';

const COL = 'flex: 1 1 140px; display: flex; flex-direction: column; gap: 10px; font-size: 15px';
const COL_HEAD = 'color: #FFFFFF; font-weight: 600; margin-bottom: 4px';

function FooterDevelopedBy({ t }: { t: (key: 'footer.developedBy') => string }) {
  return (
    <>
      {t('footer.developedBy')}{' '}
      <a href="https://www.saqrih.com" target="_blank" rel="noopener noreferrer">Saqrih</a>
    </>
  );
}

type Props = {
  /* /signin uses a reduced footer with no brand block or nav columns */
  minimal?: boolean;
  /* /help and /about point these at their on-page sections */
  safetyHref?: string;
};

export default function SiteFooter({ minimal, safetyHref = '/help' }: Props) {
  const { lang, t: baseT } = useUiLocale();
  const footerChrome = useSiteChromeBody('footer');
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => chromeTranslate(lang, baseT, footerChrome, key, vars),
    [lang, baseT, footerChrome],
  );
  if (minimal) {
    return (
      <footer className="foot" style={css('background: #15191E; color: #C9CFCB')}>
        <div className="site-footer__bottom site-footer__bottom--minimal">
          <span className="site-footer__bottom-start">{t('footer.rights')}</span>
          <span className="site-footer__bottom-center">
            <FooterDevelopedBy t={t} />
          </span>
          <span className="site-footer__bottom-end site-footer__minimal-links">
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
              {t('footer.brandName')}
              <span style={css('display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.32em; color: #D4A84B')}>{t('footer.brandSub')}</span>
            </div>
          </div>
          <p style={css('margin: 10px 0 0; max-width: 34ch; font-size: 15px')}>{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.marketplace')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.marketplace')}</span>
          <Link href="/categories">{t('footer.allCategories')}</Link>
          <Link href="/auctions">{t('footer.liveAuctions')}</Link>
          <Link href="/browse">{t('footer.latestProducts')}</Link>
        </nav>
        <nav aria-label={t('footer.company')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.company')}</span>
          <Link href="/about">{t('footer.about')}</Link>
          <Link href="/contact">{t('footer.contact')}</Link>
        </nav>
        <nav aria-label={t('footer.help')} style={css(COL)}>
          <span style={css(COL_HEAD)}>{t('footer.help')}</span>
          <Link href="/help">{t('footer.helpCentre')}</Link>
          {safetyHref.startsWith('#') ? <a href={safetyHref}>{t('footer.safetyTips')}</a> : <Link href={safetyHref}>{t('footer.safetyTips')}</Link>}
          <Link href="/legal">{t('footer.terms')}</Link>
          <Link href="/legal">{t('footer.privacy')}</Link>
        </nav>
      </div>
      <div className="site-footer__bottom">
        <span className="site-footer__bottom-start">{t('footer.rights')}</span>
        <span className="site-footer__bottom-center">
          <FooterDevelopedBy t={t} />
        </span>
        <span className="site-footer__bottom-end">{t('footer.languages')}</span>
      </div>
    </footer>
  );
}
