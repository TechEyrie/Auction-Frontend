'use client';

import Link from 'next/link';
import { API_BASE_URL } from '../lib/api';
import { fmtMinor } from '../lib/format';
import {
  listingCardPrice,
  listingCardTitle,
  mediaUrl,
  productPath,
  type PublicListing,
} from '../lib/listings';
import { useUiLocale } from '../lib/UiLocaleProvider';
import { localizedText } from '../lib/uiLocale';
import './product-listing-card.css';

export type ProductListingCardProps = {
  listing: PublicListing;
  imageUrl?: string | null;
  imageAlt?: string;
};

function humanizeLocationKey(key: string): string {
  return key.replace(/[-_]+/g, ' ').trim();
}

/** Short ALL CAPS label for the media badge (area/city). */
export function listingCardLocationBadge(listing: PublicListing): string | null {
  const label = listing.location.label?.trim();
  if (label) {
    const segment = label.split(',')[0]?.trim();
    if (segment) return segment.toUpperCase();
  }
  const key = listing.location.areaKey ?? listing.location.cityKey;
  if (key) return humanizeLocationKey(key).toUpperCase();
  return null;
}

function MapPinIcon() {
  return (
    <svg className="plc__badge-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function HeartOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.5s-6.5-4.2-8.8-7.4C1.4 10.2 2.6 6.8 5.8 5.6c2-.7 4.1.1 5.5 1.7 1.4-1.6 3.5-2.4 5.5-1.7 3.2 1.2 4.4 4.6 2.6 7.5C18.5 16.3 12 20.5 12 20.5z"
        stroke="#9A6B12"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductListingCard({ listing, imageUrl, imageAlt }: ProductListingCardProps) {
  const { lang, t } = useUiLocale();
  const href = productPath(listing);
  const title = listingCardTitle(listing, lang);
  const price = listingCardPrice(listing);
  const locationBadge = listingCardLocationBadge(listing);
  const showLiveBadge = !locationBadge && Boolean(listing.liveLotReference);

  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId) ?? listing.media[0] ?? null;
  const resolvedImageUrl = imageUrl ?? (cover ? mediaUrl(API_BASE_URL, cover.url) : null);
  const resolvedImageAlt =
    imageAlt ??
    ((cover ? localizedText(cover.alt, lang) : '') || localizedText(listing.title, lang, t('common.listingImage')));

  const priceLabelKey =
    listing.listingMethod === 'auction'
      ? 'common.startingBid'
      : listing.listingMethod === 'fixed_price'
        ? 'common.priceLabel'
        : null;

  const ctaKey =
    listing.listingMethod === 'auction'
      ? 'common.bidNow'
      : listing.listingMethod === 'fixed_price'
        ? 'common.viewListing'
        : 'common.enquire';

  return (
    <article className="plc card">
      <div className="plc__media-wrap">
        <Link href={href} className="plc__media" aria-label={title}>
          {resolvedImageUrl ? (
            <img src={resolvedImageUrl} alt={resolvedImageAlt} loading="lazy" />
          ) : (
            <span className="mkt-hint">{t('common.noImage')}</span>
          )}
        </Link>
        {locationBadge ? (
          <span className="plc__badge plc__badge--location">
            <MapPinIcon />
            <span>{locationBadge}</span>
          </span>
        ) : showLiveBadge ? (
          <span className="plc__badge plc__badge--live">{t('common.live')}</span>
        ) : null}
        <button
          type="button"
          className="plc__wish"
          aria-label={t('common.saveListing')}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <HeartOutlineIcon />
        </button>
      </div>

      <div className="plc__body">
        <h3 className="plc__title">
          <Link href={href}>{title}</Link>
        </h3>
        <p className="plc__category">{listing.category.key}</p>
      </div>

      <div className="plc__footer">
        <div className="plc__price-block">
          {priceLabelKey && price ? (
            <>
              <p className="plc__price-label">{t(priceLabelKey)}</p>
              <p className="plc__price-value">{fmtMinor(price.minor)}</p>
            </>
          ) : priceLabelKey ? (
            <p className="plc__price-label">{t(priceLabelKey)}</p>
          ) : null}
        </div>
        <Link href={href} className="plc__cta">
          {t(ctaKey)}
        </Link>
      </div>
    </article>
  );
}
