'use client';

import Link from 'next/link';
import ProductListingCard from '../../components/ProductListingCard';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useAsync } from '../../lib/useAsync';
import { type PublicListing } from '../../lib/listings';
import { useLive } from '../../lib/live';
import { appendPlaceQuery, useUiPlaceQueryKey } from '../../lib/uiPlace';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import './auctions.css';

type ListingsResponse = { listings: PublicListing[]; total: number };

/**
 * Auctions overview.
 *
 * Live lots opened by staff appear here with Bid now. Non-live auction inventory is omitted from the
 * public catalogue API, so cards without a live lot reference should not appear.
 */
export default function AuctionsPage() {
  const { t } = useUiLocale();
  const placeKey = useUiPlaceQueryKey();
  const listings = useAsync<ListingsResponse>(
    () => apiFetch<ListingsResponse>(appendPlaceQuery('/api/listings?method=auction&limit=24'), { cache: 'no-store' }),
    [placeKey],
  );
  useLive(() => listings.reload());

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{t('auctions.title')}</title>
      <SiteHeader active="auctions" />

      <section style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 28px var(--mkt-gutter-x) 36px')}>
          <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; margin-bottom: 10px')}>
            <Link href="/">{t('common.home')}</Link> <span aria-hidden="true">/</span> {t('auctions.breadcrumb')}
          </nav>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2rem, 3.6vw, 2.75rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.1")}>
            {t('auctions.h1')}
          </h1>
          <p style={css('margin: 8px 0 0; max-width: 70ch; color: #5B636B')}>
            {t('auctions.lead')}
          </p>
          <div style={css('margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap')}>
            <Link href="/browse" className="btn-primary" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}>
              {t('auctions.browseAll')}
            </Link>
            <Link href="/contact" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border: 1px solid #DAD7D0; border-radius: 12px; font-weight: 600')}>
              {t('auctions.ask')}
            </Link>
          </div>
        </div>
      </section>

      <section style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 40px var(--mkt-gutter-x) 24px')}>
        <div style={css('background: #F6EEDC; border-radius: 18px; padding: 20px')}>
          <h2 style={css('margin: 0 0 6px; font-size: 16px; font-weight: 700')}>{t('auctions.howTitle')}</h2>
          <ul style={css('margin: 0; padding-left: 20px; font-size: 14px; color: #3D3420; display: flex; flex-direction: column; gap: 4px')}>
            <li>{t('auctions.how1')}</li>
            <li>{t('auctions.how2a')}<Link href="/account">{t('auctions.how2link')}</Link>.</li>
            <li>{t('auctions.how3')}</li>
          </ul>
        </div>
      </section>

      <section style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 24px var(--mkt-gutter-x) 80px')}>
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 20px')}>
          <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; letter-spacing: -0.02em; font-weight: 700")}>
            {t('auctions.liveTitle')}
          </h2>
          <span className="mkt-hint">{listings.data ? t(listings.data.total === 1 ? 'auctions.record' : 'auctions.records', { n: listings.data.total }) : ''}</span>
        </div>

        {listings.loading && (
          <p role="status" className="mkt-state" data-state="loading">
            {t('auctions.loading')}
          </p>
        )}

        {listings.error && (
          <div role="alert" className="mkt-state" data-state="error">
            <p style={css('margin: 0 0 10px; font-weight: 600')}>{listings.error}</p>
            <button type="button" onClick={() => listings.reload()} className="btn-primary" style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {!listings.loading && !listings.error && (listings.data?.listings.length ?? 0) === 0 && (
          <p className="mkt-state">{t('auctions.empty')}</p>
        )}

        <div className="plc-grid">
          {(listings.data?.listings ?? []).map((listing) => (
            <ProductListingCard key={listing.listingReference} listing={listing} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
