'use client';

import { useRef } from 'react';
import { API_BASE_URL } from '../lib/api';
import { localizedText, type UiLang } from '../lib/uiLocale';
import { mediaUrl, type PublicListing } from '../lib/listings';
import ProductListingCard from './ProductListingCard';
import './product-carousel.css';

export type ProductCarouselProps = {
  title: string;
  subtitle?: string;
  listings: PublicListing[];
  emptyText?: string;
  'aria-label': string;
  lang: UiLang;
  imageFallbackAlt: string;
};

function cardImage(listing: PublicListing, lang: UiLang, fallbackAlt: string): { url: string | null; alt: string } {
  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId) ?? listing.media[0] ?? null;
  return {
    url: cover ? mediaUrl(API_BASE_URL, cover.url) : null,
    alt: (cover ? localizedText(cover.alt, lang) : '') || localizedText(listing.title, lang, fallbackAlt),
  };
}

function ChevronIcon({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductCarousel({ title, subtitle, listings, emptyText, lang, imageFallbackAlt, ...rest }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isEmpty = listings.length === 0;

  const scroll = (direction: 'prev' | 'next') => {
    const track = trackRef.current;
    if (!track) return;
    const delta = direction === 'next' ? track.clientWidth : -track.clientWidth;
    track.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="home-section product-carousel" aria-label={rest['aria-label']}>
      <div className="product-carousel__header">
        <div>
          <h2 className="product-carousel__title">{title}</h2>
          {subtitle ? <p className="product-carousel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {isEmpty ? (
        emptyText ? <p className="mkt-state">{emptyText}</p> : null
      ) : (
        <div className="product-carousel__viewport">
          <button type="button" className="product-carousel__nav product-carousel__nav--prev" onClick={() => scroll('prev')} aria-label="Previous">
            <ChevronIcon direction="prev" />
          </button>
          <div ref={trackRef} className="product-carousel__track" tabIndex={0}>
            {listings.map((listing) => {
              const image = cardImage(listing, lang, imageFallbackAlt);
              return (
                <div key={listing.listingReference} className="product-carousel__slide">
                  <ProductListingCard listing={listing} imageUrl={image.url} imageAlt={image.alt} />
                </div>
              );
            })}
          </div>
          <button type="button" className="product-carousel__nav product-carousel__nav--next" onClick={() => scroll('next')} aria-label="Next">
            <ChevronIcon direction="next" />
          </button>
        </div>
      )}
    </section>
  );
}
