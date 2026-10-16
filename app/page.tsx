'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import AudiencePicker from '../components/AudiencePicker';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../lib/api';
import { css, PAGE_ROOT } from '../lib/css';
import { useAsync } from '../lib/useAsync';
import { useLive } from '../lib/live';
import { fmtMinor } from '../lib/format';
import { METHOD_LABEL, productPath, type ListingMethod, type PublicListing } from '../lib/listings';
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

const MODES = [
  {
    id: 'buy',
    label: 'Buy',
    steps: [
      ['Browse published listings', 'Filter by category, city, condition or listing method.'],
      ['Enquire through the marketplace', 'Our team passes your question on and arranges a viewing.'],
      ['Inspect, then settle', 'Nothing is bought or reserved through this website yet.'],
    ],
  },
  {
    id: 'sell',
    label: 'Sell',
    steps: [
      ['Talk to our team', 'Items are consigned with the marketplace; there is no self-service posting.'],
      ['We photograph and describe it', 'Listing content is written by staff, with your approval.'],
      ['Decide how it sells', 'Fixed price or auction, once those business rules are signed off.'],
    ],
  },
  {
    id: 'bid',
    label: 'Bid',
    steps: [
      ['Find a live auction', 'Open Auctions or a listing with Bid now when staff have opened bidding.'],
      ['Place a bid', 'The server accepts or rejects each amount — there is no auto-bid.'],
      ['Win and pay', 'Winning bids become orders; pay through the approved gateway when offered.'],
    ],
  },
];

function cardImage(listing: PublicListing): { url: string | null; alt: string } {
  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId) ?? listing.media[0] ?? null;
  return { url: cover ? `${API_BASE_URL}${cover.url}` : null, alt: cover?.alt.en ?? listing.title.en ?? 'Listing image' };
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
  const [mode, setMode] = useState('buy');
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
  const roots = (categories.data?.categories ?? []).filter((category) => category.parentKey === null).slice(0, 12);
  const recentListings = (recent.data?.listings ?? []).slice(0, 8);
  const auctionCards = (auctionListings.data?.listings ?? []).slice(0, 4);
  const activeMode = MODES.find((entry) => entry.id === mode) ?? MODES[0]!;

  const seg = (selected: boolean) =>
    selected ? { bg: '#FFFFFF', fg: '#15191E' } : { bg: 'transparent', fg: '#4B535A' };

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Araq &amp; Kahraman Auctions</title>
      <SiteHeader home />

      <section id="top" style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: 1240px; margin: 0 auto; padding: 72px 24px 64px; display: flex; flex-wrap: wrap; gap: 48px; align-items: center')}>
          <div style={css('flex: 999 1 560px; min-width: 0')}>
            <p style={css('margin: 0 0 18px; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: #F6EEDC; color: #9A6B12; font-size: 14px; font-weight: 600')}>
              A curated marketplace, managed by our team
            </p>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.5rem, 5vw, 4.1rem); line-height: 1.04; letter-spacing: -0.035em; font-weight: 700; max-width: 14ch")}>
              {'Browse, enquire, '}
              <span style={css('color: #9A6B12')}>and settle safely.</span>
            </h1>
            <p style={css('margin: 20px 0 32px; font-size: 19px; color: #5B636B; max-width: 46ch')}>
              Every listing here is published by our inventory team. Live auctions show a Bid now link; fixed-price
              checkout and deposits are not offered on this site yet.
            </p>
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (search.trim()) params.set('q', search.trim());
                if (heroAudience) params.set('audience', heroAudience);
                if (heroCategory) params.set('category', heroCategory);
                router.push(params.toString() ? `/browse?${params.toString()}` : '/browse');
              }}
              style={css('display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; background: #FFFFFF; border: 1px solid #DAD7D0; border-radius: 16px; box-shadow: 0 18px 40px -28px rgba(21,25,30,.45); max-width: 680px')}
            >
              <label htmlFor="q" className="sr">
                What are you looking for?
              </label>
              <div style={css('flex: 3 1 240px; display: flex; align-items: center; gap: 10px; padding: 0 12px; min-width: 0')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B636B" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
                </svg>
                <input
                  id="q"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search published listings…"
                  style={css('flex: 1; min-width: 0; height: 48px; border: 0; font: inherit; font-size: 16px; color: #15191E; background: transparent; outline-offset: 6px')}
                />
              </div>
              <label htmlFor="cat" className="sr">
                Category
              </label>
              <select
                id="cat"
                value={heroCategory}
                onChange={(event) => setHeroCategory(event.target.value)}
                style={css('flex: 1 1 150px; height: 52px; border: 0; border-left: 1px solid #E6E4DF; padding: 0 12px; font: inherit; font-size: 15px; color: #2A3036; background: transparent; cursor: pointer')}
              >
                <option value="">All categories</option>
                {roots.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary" style={css('flex: 0 0 auto; height: 52px; padding: 0 26px; border: 0; border-radius: 11px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; font-size: 16px; cursor: pointer')}>
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
                <div style={css('height: 200px; border-radius: 14px; background: #2B2620; display: flex; align-items: center; justify-content: center; overflow: hidden')}>
                  {heroImage.url ? (
                    <img src={heroImage.url} alt={heroImage.alt} style={css('width: 100%; height: 100%; object-fit: cover')} />
                  ) : (
                    <span style={css('color: #AEB5B0; font-size: 14px')}>No image published</span>
                  )}
                </div>
                <div>
                  <h2 style={css("margin: 0 0 4px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px; font-weight: 600; letter-spacing: -0.01em")}>
                    <Link href={productPath(heroListing)} style={css('color: #FFFFFF')}>
                      {heroListing.title.en ?? heroListing.title.ar ?? 'Untitled listing'}
                    </Link>
                  </h2>
                  <p style={css('margin: 0; font-size: 14px; color: #AEB5B0')}>
                    {METHOD_LABEL[heroListing.listingMethod]}
                    {heroListing.condition ? ` · ${heroListing.condition.replace('_', ' ')}` : ''} ·{' '}
                    {heroListing.location.label ?? 'Location not published'}
                  </p>
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

      <section id="categories" style={css('max-width: 1240px; margin: 0 auto; padding: 72px 24px 24px')}>
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

        <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px')}>
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

      <section id="auctions" style={css('max-width: 1240px; margin: 0 auto; padding: 64px 24px 24px')}>
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
            const currentMinor = listing.currentAmountMinor ?? listing.startingBidMinor;
            return (
              <article key={listing.listingReference} className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column')}>
                <Link href={productPath(listing)} aria-label={listing.title.en ?? listing.listingReference} style={css('position: relative; height: 170px; background: #F3F1EC; display: flex; align-items: center; justify-content: center; overflow: hidden')}>
                  {image.url ? <img src={image.url} alt={image.alt} style={css('width: 100%; height: 100%; object-fit: cover')} loading="lazy" /> : <span className="mkt-hint">No image</span>}
                  {live ? (
                    <span style={css('position: absolute; top: 12px; left: 12px; padding: 5px 10px; border-radius: 999px; background: #C2410C; color: #FFFFFF; font-size: 12px; font-weight: 700')}>
                      Live
                    </span>
                  ) : null}
                </Link>
                <div style={css('padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1')}>
                  <h3 style={css('margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35')}>
                    <Link href={productPath(listing)} style={css('color: #15191E')}>
                      {listing.title.en ?? listing.title.ar ?? 'Untitled listing'}
                    </Link>
                  </h3>
                  <p className="mkt-hint">
                    {listing.category.key} · {listing.location.label ?? 'Location not published'} · {postedLabel(listing.publishedAt)}
                  </p>
                  {typeof currentMinor === 'number' ? (
                    <p className="mkt-hint" style={css('font-weight: 600; color: #15191E')}>
                      Current: {fmtMinor(currentMinor)}
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

      <section id="how" style={css('max-width: 1240px; margin: 0 auto; padding: 72px 24px 24px')}>
        <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 24px; padding: clamp(24px, 4vw, 48px)')}>
          <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 32px')}>
            <div>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
                How it works
              </h2>
              <p style={css('margin: 6px 0 0; color: #5B636B')}>What you can and cannot do here today.</p>
            </div>
            <div role="tablist" aria-label="I want to" style={css('display: flex; gap: 6px; padding: 5px; background: #F3F1EC; border-radius: 12px')}>
              {MODES.map((entry) => {
                const style = seg(mode === entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === entry.id}
                    onClick={() => setMode(entry.id)}
                    style={css(`height: 40px; padding: 0 20px; border: 0; border-radius: 9px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; background: ${style.bg}; color: ${style.fg}`)}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>
          <ol style={css('list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 28px')}>
            {activeMode.steps.map((step, index) => (
              <li key={step[0]} style={css('display: flex; flex-direction: column; gap: 10px')}>
                <span style={css("width: 40px; height: 40px; border-radius: 50%; background: #9A6B12; color: #FFFFFF; font-family: 'Schibsted Grotesk', sans-serif; font-weight: 700; display: flex; align-items: center; justify-content: center")}>
                  {index + 1}
                </span>
                <h3 style={css('margin: 6px 0 0; font-size: 19px; font-weight: 600')}>{step[0]}</h3>
                <p style={css('margin: 0; color: #5B636B')}>{step[1]}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="listings" style={css('max-width: 1240px; margin: 0 auto; padding: 72px 24px 24px')}>
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
            return (
              <article key={listing.listingReference} className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column')}>
                <Link href={productPath(listing)} aria-label={listing.title.en ?? listing.listingReference} style={css('position: relative; height: 170px; background: #F3F1EC; display: flex; align-items: center; justify-content: center; overflow: hidden')}>
                  {image.url ? <img src={image.url} alt={image.alt} style={css('width: 100%; height: 100%; object-fit: cover')} loading="lazy" /> : <span className="mkt-hint">No image</span>}
                </Link>
                <div style={css('padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 6px')}>
                  <h3 style={css('margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35')}>
                    <Link href={productPath(listing)} style={css('color: #15191E')}>
                      {listing.title.en ?? listing.title.ar ?? 'Untitled listing'}
                    </Link>
                  </h3>
                  <p className="mkt-hint">
                    {METHOD_LABEL[listing.listingMethod]}
                    {listing.condition ? ` · ${listing.condition.replace('_', ' ')}` : ''} · {listing.location.label ?? 'Location not published'}
                  </p>
                  <p className="mkt-hint">{postedLabel(listing.publishedAt)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="sell" style={css('max-width: 1240px; margin: 0 auto; padding: 72px 24px 24px')}>
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
            <Link href="/post" style={css('height: 52px; padding: 0 24px; border-radius: 12px; background: #FFFFFF; color: #9A6B12; font-weight: 700; display: flex; align-items: center')}>
              Submit an item
            </Link>
            <Link href="/contact" style={css('height: 52px; padding: 0 24px; border-radius: 12px; border: 1.5px solid #E3C78C; color: #FFFFFF; font-weight: 600; display: flex; align-items: center')}>
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

      <SiteFooter apps />
    </div>
  );
}
