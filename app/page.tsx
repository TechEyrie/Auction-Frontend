'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import AudiencePicker from '../components/AudiencePicker';
import CategoryMenu from '../components/CategoryMenu';
import LocalInfoBar from '../components/LocalInfoBar';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../lib/api';
import { css, PAGE_ROOT } from '../lib/css';
import { useAsync } from '../lib/useAsync';
import { useLive } from '../lib/live';
import { fmtMinor } from '../lib/format';
import {
  listingCardPrice,
  listingCardTitle,
  mediaUrl,
  METHOD_LABEL,
  productPath,
  type ListingMethod,
  type PublicListing,
} from '../lib/listings';
import './main.css';

/**
 * The homepage.
 *
 * Every listing and category shown here is read from the published catalogue: there is no demo
 * inventory. Live auction lots link to bid pages; the search box performs a real, shareable search.
 */

const ICON: Record<string, string> = {
  vehicles: 'M3 13l2-6h14l2 6v4H3z M5 17v2 M19 17v2 M3 13h18',
  'real-estate': 'M3 11l9-7 9 7v9H3z M9 20v-6h6v6',
  electronics: 'M7 3h10v18H7z M11 18h2',
  services: 'M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2z',
  jobs: 'M3 8h18v12H3z M8 8V5h8v3 M3 13h18',
  family: 'M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z',
  sport: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  travel: 'M4 8h16v12H4z M9 8V5h6v3 M9 12v4 M15 12v4',
  numbers: 'M5 9h14 M5 15h14 M10 4L8 20 M16 4l-2 16',
  animals: 'M5 19C5 9 11 5 20 4c-1 9-5 15-15 15z M5 19l8-8',
  antiques: 'M9 3h6 M10 3v3C7 7 5 10 5 14c0 4 3 7 7 7s7-3 7-7c0-4-2-7-5-8V3',
  other: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  fallback: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
};

type Category = { key: string; name: string; parentKey: string | null; listingMethods: ListingMethod[] };
type ListingsResponse = { listings: PublicListing[]; total: number };

const AUCTION_STEPS = [
  {
    title: 'Register Your Account',
    description: 'Create your account and complete your quick verification',
  },
  {
    title: 'Browse Available Auctions',
    description: 'Place bids, receive alerts and stay in control',
  },
  {
    title: 'Place Your Bid',
    description: 'Bid on your favorite items and monitor real-time auction updates.',
  },
  {
    title: 'Win and Checkout',
    description: 'If you win, proceed to checkout and complete the payment securely.',
  },
];

function cardImage(listing: PublicListing): { url: string | null; alt: string } {
  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId) ?? listing.media[0] ?? null;
  return { url: cover ? mediaUrl(API_BASE_URL, cover.url) : null, alt: cover?.alt.en ?? listing.title.en ?? 'Listing image' };
}

function postedLabel(iso: string | null): string {
  if (!iso) return 'Not published';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function HomePage() {
  const router = useRouter();
  const [auctionStep, setAuctionStep] = useState(0);
  const [search, setSearch] = useState('');
  const [heroCategory, setHeroCategory] = useState('');
  const [heroAudience, setHeroAudience] = useState<'' | 'men' | 'women'>('');

  const featured = useAsync<ListingsResponse>(() => apiFetch<ListingsResponse>('/api/listings?featured=true&limit=1', { cache: 'no-store' }), []);
  const recent = useAsync<ListingsResponse>(() => apiFetch<ListingsResponse>('/api/listings?limit=8', { cache: 'no-store' }), []);
  const auctionListings = useAsync<ListingsResponse>(() => apiFetch<ListingsResponse>('/api/listings?method=auction&limit=4', { cache: 'no-store' }), []);
  const categories = useAsync<{ categories: Category[] }>(() => apiFetch<{ categories: Category[] }>('/api/catalog/categories', { cache: 'no-store' }), []);
  useLive(() => {
    featured.reload({ soft: true });
    recent.reload({ soft: true });
    auctionListings.reload({ soft: true });
  });

  const heroListing = featured.data?.listings[0] ?? recent.data?.listings[0] ?? null;
  const heroImage = heroListing ? cardImage(heroListing) : { url: null, alt: '' };
  // Sub-categories hidden for now; restore when client wants depth.
  // Property omitted so the six remaining roots stay on one desktop row.
  const roots = (categories.data?.categories ?? [])
    .filter((category) => category.parentKey === null && category.key !== 'property')
    .slice(0, 6);
  const recentListings = (recent.data?.listings ?? []).slice(0, 8);
  const auctionCards = (auctionListings.data?.listings ?? []).slice(0, 4);

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Araq &amp; Kahraman Auctions</title>
      <SiteHeader home />

      <section id="top" style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div className="home-hero">
          <div style={css('flex: 999 1 560px; min-width: 0')}>
            <p style={css('margin: 0 0 14px; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: #F6EEDC; color: #9A6B12; font-size: 13px; font-weight: 600')}>
              A curated marketplace, managed by our team
            </p>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2rem, 8vw, 4.1rem); line-height: 1.05; letter-spacing: -0.035em; font-weight: 700; max-width: 14ch")}>
              {'Browse, enquire, '}
              <span style={css('color: #9A6B12')}>and settle safely.</span>
            </h1>
            <p style={css('margin: 16px 0 24px; font-size: clamp(15px, 3.6vw, 19px); color: #5B636B; max-width: 46ch')}>
              Every listing here is published by our inventory team. Live auctions show a Bid now link; fixed-price
              checkout and deposits are not offered on this site yet.
            </p>
            <form
              role="search"
              className="mkt-search"
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (search.trim()) params.set('q', search.trim());
                if (heroAudience) params.set('audience', heroAudience);
                if (heroCategory) params.set('category', heroCategory);
                router.push(params.toString() ? `/browse?${params.toString()}` : '/browse');
              }}
            >
              <label htmlFor="q" className="sr">
                What are you looking for?
              </label>
              <div className="mkt-search__query">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A9198" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
                </svg>
                <input
                  id="q"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search published listings…"
                  autoComplete="off"
                />
              </div>
              <CategoryMenu
                value={heroCategory}
                onChange={setHeroCategory}
                options={roots.map((category) => ({ key: category.key, name: category.name }))}
              />
              <button type="submit" className="mkt-search__submit">
                Search
              </button>
            </form>
            <div style={css('margin-top: 22px; max-width: 520px')}>
              <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #5B636B')}>Shop for</p>
              <AudiencePicker value={heroAudience} onChange={setHeroAudience} />
            </div>
            <div style={css('display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; align-items: center')}>
              <Link href="/browse?audience=men" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #9A6B12; background: #F6EEDC; color: #7D5610; font-size: 14px; font-weight: 600')}>
                Men&apos;s listings
              </Link>
              <Link href="/browse?audience=women" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #9A6B12; background: #F6EEDC; color: #7D5610; font-size: 14px; font-weight: 600')}>
                Women&apos;s listings
              </Link>
              <span style={css('font-size: 14px; color: #5B636B; margin-right: 4px')}>Popular:</span>
              <Link href="/browse?q=land+cruiser" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #E6E4DF; color: #2A3036; font-size: 14px')}>
                Land Cruiser
              </Link>
              <Link href="/browse?q=iphone" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #E6E4DF; color: #2A3036; font-size: 14px')}>
                iPhone
              </Link>
              <Link href="/browse?method=auction" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #E6E4DF; color: #2A3036; font-size: 14px')}>
                Auction listings
              </Link>
              <Link href="/browse?condition=used" style={css('padding: 6px 12px; border-radius: 999px; border: 1px solid #E6E4DF; color: #2A3036; font-size: 14px')}>
                Used items
              </Link>
            </div>
          </div>

          <aside aria-label="Featured listing" style={css('flex: 1 1 360px; min-width: 0; max-width: 440px; background: #15191E; color: #FFFFFF; border-radius: 22px; padding: 22px; display: flex; flex-direction: column; gap: 18px')}>
            <div style={css('display: flex; justify-content: space-between; align-items: center')}>
              <span style={css('font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #F6B48A')}>
                {featured.data?.listings.length ? 'Featured listing' : 'Latest listing'}
              </span>
              <span style={css('font-size: 13px; color: #AEB5B0')}>{recent.data ? `${recent.data.total} published` : ''}</span>
            </div>
            {heroListing ? (
              <>
                <div className="home-hero-listing-media">
                  {heroImage.url ? (
                    <img src={heroImage.url} alt={heroImage.alt} />
                  ) : (
                    <span style={css('color: #AEB5B0; font-size: 14px')}>No image published</span>
                  )}
                </div>
                <div>
                  <h2 style={css("margin: 0 0 4px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase")}>
                    <Link href={productPath(heroListing)} style={css('color: #FFFFFF')}>
                      {listingCardTitle(heroListing)}
                    </Link>
                  </h2>
                  <p className="home-hero-listing-meta">
                    {METHOD_LABEL[heroListing.listingMethod]}
                    {heroListing.condition ? ` · ${heroListing.condition.replace('_', ' ')}` : ''} ·{' '}
                    {heroListing.location.label ?? 'Location not published'}
                  </p>
                  {(() => {
                    const price = listingCardPrice(heroListing);
                    if (!price) return null;
                    return (
                      <p style={css('margin: 10px 0 0; font-size: 20px; font-weight: 800; color: #F6B48A; letter-spacing: -0.01em')}>
                        {price.kind === 'starting' ? `Starting ${fmtMinor(price.minor)}` : fmtMinor(price.minor)}
                      </p>
                    );
                  })()}
                </div>
                <Link href={productPath(heroListing)} style={css('height: 50px; border-radius: 12px; background: #FFFFFF; color: #15191E; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center')}>
                  View this listing
                </Link>
                <p style={css('margin: -6px 0 0; font-size: 13px; color: #AEB5B0; text-align: center')}>
                  Ad {heroListing.listingReference} · {postedLabel(heroListing.publishedAt)}
                </p>
              </>
            ) : (
              <p style={css('margin: 0; font-size: 15px; color: #AEB5B0')}>
                {recent.loading ? 'Loading published listings…' : 'Nothing has been published yet. This card stays empty rather than showing sample inventory.'}
              </p>
            )}
          </aside>
        </div>
      </section>

      <LocalInfoBar />

      <section id="categories" className="home-section">
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 28px')}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
              Browse by category
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>The live category tree, exactly as our team maintains it.</p>
          </div>
          <Link href="/categories" style={css('font-weight: 600')}>
            All categories →
          </Link>
        </div>

        {categories.error && (
          <p role="alert" className="mkt-state" data-state="error">
            Categories could not be loaded ({categories.error}).
          </p>
        )}
        {!categories.error && roots.length === 0 && (
          <p className="mkt-state">{categories.loading ? 'Loading categories…' : 'No categories are published yet.'}</p>
        )}

        <div className="cat-grid">
          {roots.map((category) => (
            <Fragment key={category.key}>
              <Link
                href={`/browse?category=${encodeURIComponent(category.key)}`}
                className="cat"
                style={css('display: flex; flex-direction: column; gap: 14px; padding: 20px; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; color: #15191E; transition: border-color .15s, background .15s')}
              >
                <span style={css('width: 44px; height: 44px; border-radius: 12px; background: #F3F1EC; display: flex; align-items: center; justify-content: center')}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICON[category.key] ?? ICON.fallback}></path>
                  </svg>
                </span>
                <span>
                  <span style={css('display: block; font-weight: 600; font-size: 16px')}>{category.name}</span>
                  <span style={css('display: block; font-size: 13px; color: #5B636B')}>
                    {category.listingMethods.map((method) => METHOD_LABEL[method]).join(' · ')}
                  </span>
                </span>
              </Link>
            </Fragment>
          ))}
        </div>
      </section>

      <section id="auctions" className="home-section">
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 24px')}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
              Live auctions
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>
              Listings staff have opened for bidding. Scheduled or draft auction inventory does not appear here.
            </p>
          </div>
          <Link href="/auctions" style={css('font-weight: 600')}>
            Auction overview →
          </Link>
        </div>

        {auctionListings.error && (
          <p role="alert" className="mkt-state" data-state="error">
            Auction listings could not be loaded ({auctionListings.error}).
          </p>
        )}
        {!auctionListings.error && auctionCards.length === 0 && (
          <p className="mkt-state">{auctionListings.loading ? 'Loading live auctions…' : 'No live auctions right now. Check back after staff open bidding on a listing.'}</p>
        )}

        <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px')}>
          {auctionCards.map((listing) => {
            const image = cardImage(listing);
            const live = listing.liveLotReference;
            const title = listingCardTitle(listing);
            const price = listingCardPrice(listing);
            return (
              <article key={listing.listingReference} className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column')}>
                <Link href={productPath(listing)} aria-label={title} className="listing-card-media">
                  {image.url ? <img src={image.url} alt={image.alt} loading="lazy" /> : <span className="mkt-hint">No image</span>}
                  {live ? (
                    <span style={css('position: absolute; top: 12px; left: 12px; padding: 5px 10px; border-radius: 999px; background: #C2410C; color: #FFFFFF; font-size: 12px; font-weight: 700')}>
                      Live
                    </span>
                  ) : null}
                </Link>
                <div style={css('padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1')}>
                  <h3 style={css('margin: 0; font-size: 16px; font-weight: 700; line-height: 1.35; letter-spacing: 0.02em; text-transform: uppercase')}>
                    <Link href={productPath(listing)} style={css('color: #15191E')}>
                      {title}
                    </Link>
                  </h3>
                  <p className="listing-card-meta">
                    {listing.category.key} · {listing.location.label ?? 'Location not published'} · {postedLabel(listing.publishedAt)}
                  </p>
                  {price ? (
                    <p style={css('margin: 0; font-size: 18px; font-weight: 800; color: #9A6B12; letter-spacing: -0.01em')}>
                      {price.kind === 'starting' ? `Starting ${fmtMinor(price.minor)}` : fmtMinor(price.minor)}
                    </p>
                  ) : null}
                  {live ? (
                    <Link href={productPath(listing)} className="btn-primary" style={css('margin-top: auto; display: inline-flex; align-items: center; justify-content: center; height: 42px; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}>
                      Bid now
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="how" className="home-section how-auction">
        <header className="how-auction__header">
          <h2 className="how-auction__title">How Our Auction Works</h2>
          <p className="how-auction__subtitle">
            Learn how to participate and win in our online auction process step by step.
          </p>
        </header>
        <div className="how-auction__body">
          <div className="how-auction__media">
            <img
              src="/how_our_auctions_work.jpg"
              alt="Live auction hall with bidders and an auctioneer on stage"
              width={720}
              height={720}
              loading="lazy"
            />
          </div>
          <div className="how-auction__steps-wrap">
            <ol className="how-auction__steps" aria-label="Auction process steps">
              {AUCTION_STEPS.map((step, index) => {
                const active = auctionStep === index;
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      className={active ? 'how-auction__step is-active' : 'how-auction__step'}
                      aria-current={active ? 'step' : undefined}
                      onClick={() => setAuctionStep(index)}
                    >
                      <span className="how-auction__step-num" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="how-auction__step-copy">
                        <span className="how-auction__step-title">{step.title}</span>
                        <span className="how-auction__step-desc">{step.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="how-auction__rail" aria-hidden="true">
              <span className="how-auction__rail-line" />
              {AUCTION_STEPS.map((step, index) => (
                <span
                  key={step.title}
                  className={auctionStep === index ? 'how-auction__rail-dot is-active' : 'how-auction__rail-dot'}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="listings" className="home-section">
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 24px')}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
              Fresh listings
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>The most recently published records from our catalogue.</p>
          </div>
          <Link href="/browse" style={css('font-weight: 600')}>
            View all →
          </Link>
        </div>

        {recent.error && (
          <p role="alert" className="mkt-state" data-state="error">
            Listings could not be loaded ({recent.error}).
          </p>
        )}
        {!recent.error && recentListings.length === 0 && (
          <p className="mkt-state">{recent.loading ? 'Loading listings…' : 'No listings have been published yet.'}</p>
        )}

        <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px')}>
          {recentListings.map((listing) => {
            const image = cardImage(listing);
            const title = listingCardTitle(listing);
            const price = listingCardPrice(listing);
            return (
              <article key={listing.listingReference} className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column')}>
                <Link href={productPath(listing)} aria-label={title} className="listing-card-media">
                  {image.url ? <img src={image.url} alt={image.alt} loading="lazy" /> : <span className="mkt-hint">No image</span>}
                </Link>
                <div style={css('padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 6px')}>
                  <h3 style={css('margin: 0; font-size: 16px; font-weight: 700; line-height: 1.35; letter-spacing: 0.02em; text-transform: uppercase')}>
                    <Link href={productPath(listing)} style={css('color: #15191E')}>
                      {title}
                    </Link>
                  </h3>
                  <p className="listing-card-meta">
                    {METHOD_LABEL[listing.listingMethod]}
                    {listing.condition ? ` · ${listing.condition.replace('_', ' ')}` : ''} · {listing.location.label ?? 'Location not published'}
                  </p>
                  {price ? (
                    <p style={css('margin: 2px 0 0; font-size: 18px; font-weight: 800; color: #9A6B12; letter-spacing: -0.01em')}>
                      {price.kind === 'starting' ? `Starting ${fmtMinor(price.minor)}` : fmtMinor(price.minor)}
                    </p>
                  ) : null}
                  <p className="mkt-hint">{postedLabel(listing.publishedAt)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="sell" className="home-section">
        <div style={css('background: #9A6B12; color: #FFFFFF; border-radius: 24px; padding: clamp(28px, 5vw, 56px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between')}>
          <div style={css('flex: 1 1 420px; min-width: 0')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(28px, 3.4vw, 40px); letter-spacing: -0.025em; font-weight: 700; line-height: 1.1")}>
              Got something to sell?
            </h2>
            <p style={css('margin: 12px 0 0; font-size: 18px; color: #F6EAD0; max-width: 48ch')}>
              Send us the details. Our team consigns items, writes the listing and publishes it — there is no
              self-service posting, and no automatic payouts.
            </p>
          </div>
          <div style={css('display: flex; flex-wrap: wrap; gap: 12px')}>
            <Link href="/contact" style={css('height: 52px; padding: 0 24px; border-radius: 12px; background: #FFFFFF; color: #9A6B12; font-weight: 700; display: flex; align-items: center')}>
              Talk to the team
            </Link>
          </div>
        </div>
      </section>

      <section style={css('max-width: 1240px; margin: 0 auto; padding: 56px 24px 80px')}>
        <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 28px')}>
          <div style={css('display: flex; gap: 14px')}>
            <span style={css('flex: 0 0 44px; height: 44px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4"></path>
              </svg>
            </span>
            <div>
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>Staff-published listings</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                Nothing appears here unless an operator published it against a real category.
              </p>
            </div>
          </div>
          <div style={css('display: flex; gap: 14px')}>
            <span style={css('flex: 0 0 44px; height: 44px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4"></path>
              </svg>
            </span>
            <div>
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>No hidden amounts</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                No prices, deposits or buyer premiums are displayed until those rules are approved.
              </p>
            </div>
          </div>
          <div style={css('display: flex; gap: 14px')}>
            <span style={css('flex: 0 0 44px; height: 44px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h16v11H8l-4 4z M8 10h8"></path>
              </svg>
            </span>
            <div>
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>Enquiries, not chat</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                Messages come to our team; there is no live chat, and no contact details are published.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
