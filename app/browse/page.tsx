'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import AudiencePicker from '../../components/AudiencePicker';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { fmtMinor } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import {
  applyBrowseChange,
  browseIsFiltered,
  browseQuery,
  coverImage,
  LISTING_METHODS,
  listingCardPrice,
  listingCardTitle,
  METHOD_LABEL,
  parseBrowseState,
  mediaUrl,
  productPath,
  type BrowseState,
  type ListingMethod,
  type PublicListing,
} from '../../lib/listings';
import './browse.css';

type Category = { key: string; name: string; parentKey: string | null; depth: number; listingMethods: ListingMethod[] };
type LocationOption = { key: string; label: string; cityKey: string };

type ListingsResponse = {
  listings: PublicListing[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: string;
};

const SKELETON_COUNT = 12;

function thumbUrl(listing: PublicListing): string | null {
  const url = coverImage(listing);
  return url ? mediaUrl(API_BASE_URL, url) : null;
}

function postedLabel(iso: string | null): string {
  if (!iso) return 'Draft';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function loadingStatusLabel(state: BrowseState): string {
  if (state.q) return 'Searching listings…';
  if (browseIsFiltered(state)) return 'Filtering listings…';
  return 'Loading listings…';
}

function BrowseListingSkeletonGrid({ count = SKELETON_COUNT }: { count?: number }) {
  return (
    <div className="browse-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="browse-skel">
          <div className="browse-skel__media" />
          <div className="browse-skel__body">
            <div className="browse-skel__line browse-skel__line--title" />
            <div className="browse-skel__line browse-skel__line--meta" />
            <div className="browse-skel__line browse-skel__line--meta2" />
            <div className="browse-skel__line browse-skel__line--price" />
          </div>
        </article>
      ))}
    </div>
  );
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseBrowseState(new URLSearchParams(searchParams.toString())), [searchParams]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.audience) params.set('audience', state.audience);
    if (state.category) params.set('category', state.category);
    if (state.method) params.set('method', state.method);
    if (state.condition) params.set('condition', state.condition);
    if (state.city) params.set('city', state.city);
    if (state.featured) params.set('featured', 'true');
    if (state.sort !== 'recent') params.set('sort', state.sort);
    params.set('page', String(state.page));
    params.set('limit', '12');
    return params.toString();
  }, [state]);

  const listings = useAsync<ListingsResponse>(() => apiFetch<ListingsResponse>(`/api/listings?${query}`, { cache: 'no-store' }), [query]);
  const categories = useAsync<{ categories: Category[] }>(() => apiFetch<{ categories: Category[] }>('/api/catalog/categories', { cache: 'no-store' }), []);
  const locations = useAsync<{ locations: LocationOption[] }>(() => apiFetch<{ locations: LocationOption[] }>('/api/catalog/locations', { cache: 'no-store' }), []);

  const [searchText, setSearchText] = useState(state.q);
  /** True from filter click until the matching listings request finishes — avoids stale cards during navigation. */
  const [filterPending, setFilterPending] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearchText(state.q);
  }, [state.q]);

  useEffect(() => {
    if (!listings.loading) setFilterPending(false);
  }, [listings.loading, query]);

  /** Every filter change is navigation: the URL is the state, so reload and Back/Forward work. */
  function update(change: Partial<BrowseState>): void {
    const next = applyBrowseChange(state, change);
    const qs = browseQuery(next);
    const href = qs ? `/browse?${qs}` : '/browse';
    const currentHref = browseQuery(state) ? `/browse?${browseQuery(state)}` : '/browse';
    if (href === currentHref) return;
    setFilterPending(true);
    router.push(href);
  }

  // Sub-categories hidden for now; restore when client wants depth.
  const roots = (categories.data?.categories ?? []).filter((category) => category.parentKey === null);
  const page = listings.data?.page ?? state.page;
  const totalPages = listings.data?.totalPages ?? 1;
  const pages: Array<number | '…'> = [];
  for (const candidate of [1, page - 1, page, page + 1, totalPages]) {
    if (candidate < 1 || candidate > totalPages) continue;
    if (pages.includes(candidate)) continue;
    if (pages.length > 0 && typeof pages[pages.length - 1] === 'number' && candidate - (pages[pages.length - 1] as number) > 1) pages.push('…');
    pages.push(candidate);
  }

  const isUpdating = listings.loading || filterPending;
  const resultListings = isUpdating ? [] : (listings.data?.listings ?? []);
  const showEmpty = !isUpdating && !listings.error && resultListings.length === 0;

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Browse listings — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="buy" />

      <section style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: 1240px; margin: 0 auto; padding: 28px 24px 32px')}>
          <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; margin-bottom: 10px')}>
            <Link href="/">Home</Link> <span aria-hidden="true">/</span> Browse
          </nav>
          <div style={css('display: flex; flex-wrap: wrap; gap: 20px; align-items: end; justify-content: space-between')}>
            <div>
              <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2rem, 3.6vw, 2.75rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.1")}>
                Browse inventory
              </h1>
              <p style={css('margin: 8px 0 0; color: #5B636B')}>
                Published listings from our catalogue. Prices, bids and buyer premiums are not shown until those
                features are approved.
              </p>
            </div>
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                update({ q: searchText.trim() });
              }}
              style={css('flex: 0 1 480px; min-width: 0; display: flex; gap: 8px; padding: 6px; border: 1px solid #DAD7D0; border-radius: 14px; background: #FFFFFF')}
            >
              <label htmlFor="bq" className="sr">
                Search listings
              </label>
              <input
                id="bq"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search listings…"
                style={css('flex: 1; min-width: 0; height: 44px; border: 0; padding: 0 12px; font: inherit; font-size: 15px; background: transparent')}
              />
              <button type="submit" className="btn-primary" style={css('height: 44px; padding: 0 20px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                Search
              </button>
            </form>
          </div>
          <div style={css('margin-top: 22px; max-width: 520px')}>
            <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #5B636B')}>Shop for</p>
            <AudiencePicker value={state.audience} onChange={(audience) => update({ audience })} />
          </div>
        </div>
      </section>

      <div className="browse-layout" style={css('max-width: 1240px; margin: 0 auto; padding: 32px 24px 72px; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start')}>
        <div className="browse-filters-toggle-wrap">
          <button
            type="button"
            className="browse-filters-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? 'Hide filters' : 'Show filters'}
            {browseIsFiltered(state) ? ' · active' : ''}
          </button>
        </div>
        <aside
          aria-label="Filters"
          className={filtersOpen ? 'browse-filters is-open' : 'browse-filters'}
          style={css('flex: 1 1 260px; min-width: 0; max-width: 100%; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 26px')}
        >
          <div style={css('display: flex; justify-content: space-between; align-items: center')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 20px; font-weight: 700")}>Filters</h2>
            <button type="button" onClick={() => router.push('/browse')} style={css('height: 36px; padding: 0 10px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer')}>
              Clear all
            </button>
          </div>

          <div>
            <span className="lbl">Category</span>
            {categories.error && <p className="mkt-hint">Categories could not be loaded.</p>}
            <div style={css('display: flex; flex-direction: column; gap: 4px')}>
              <button
                type="button"
                onClick={() => update({ category: '' })}
                aria-pressed={state.category === ''}
                style={css(`height: 42px; padding: 0 12px; border: 0; border-radius: 10px; text-align: left; font: inherit; font-size: 15px; cursor: pointer; background: ${state.category === '' ? '#F6EEDC' : 'transparent'}; color: ${state.category === '' ? '#7D5610' : '#2A3036'}; font-weight: ${state.category === '' ? 700 : 500}`)}
              >
                All categories
              </button>
              {roots.map((root) => (
                <button
                  key={root.key}
                  type="button"
                  onClick={() => update({ category: root.key })}
                  aria-pressed={state.category === root.key}
                  style={css(`height: 42px; padding: 0 12px; border: 0; border-radius: 10px; text-align: left; font: inherit; font-size: 15px; cursor: pointer; background: ${state.category === root.key ? '#F6EEDC' : 'transparent'}; color: ${state.category === root.key ? '#7D5610' : '#2A3036'}; font-weight: ${state.category === root.key ? 700 : 500}`)}
                >
                  {root.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="lbl">Listing method</span>
            <div style={css('display: flex; gap: 8px; flex-wrap: wrap')}>
              {LISTING_METHODS.map((method) => {
                const on = state.method === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => update({ method: on ? '' : method })}
                    aria-pressed={on}
                    style={css(`height: 40px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid ${on ? '#15191E' : '#DAD7D0'}; background: ${on ? '#15191E' : '#FFFFFF'}; color: ${on ? '#FFFFFF' : '#2A3036'}`)}
                  >
                    {METHOD_LABEL[method]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="lbl">Condition</span>
            <div style={css('display: flex; gap: 8px; flex-wrap: wrap')}>
              {(['new', 'like_new', 'used', 'refurbished'] as const).map((condition) => {
                const on = state.condition === condition;
                return (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => update({ condition: on ? '' : condition })}
                    aria-pressed={on}
                    style={css(`height: 40px; padding: 0 14px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid ${on ? '#15191E' : '#DAD7D0'}; background: ${on ? '#15191E' : '#FFFFFF'}; color: ${on ? '#FFFFFF' : '#2A3036'}`)}
                  >
                    {condition.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="loc" className="lbl">
              City
            </label>
            <select id="loc" className="field" value={state.city} onChange={(event) => update({ city: event.target.value })} style={css('cursor: pointer')}>
              <option value="">All cities</option>
              {[...new Set((locations.data?.locations ?? []).map((location) => location.cityKey))].map((cityKey) => (
                <option key={cityKey} value={cityKey}>
                  {cityKey}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="lbl">Placement</span>
            <button
              type="button"
              onClick={() => update({ featured: !state.featured })}
              aria-pressed={state.featured}
              style={css(`height: 42px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; border: 1px solid ${state.featured ? '#15191E' : '#DAD7D0'}; background: ${state.featured ? '#15191E' : '#FFFFFF'}; color: ${state.featured ? '#FFFFFF' : '#2A3036'}`)}
            >
              Featured listings only
            </button>
          </div>

          <Link href="/auctions" style={css('display: flex; gap: 12px; align-items: center; padding: 14px; border-radius: 14px; background: #F6EEDC; color: #15191E')}>
            <span style={css('font-size: 14px')}>
              <strong style={css('display: block')}>Auction listings</strong>
              See what is being prepared for auction →
            </span>
          </Link>
        </aside>

        <main style={css('flex: 999 1 560px; min-width: 0')} aria-busy={isUpdating}>
          <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px')}>
            {isUpdating ? (
              <p className="browse-status-pulse" role="status" aria-live="polite">
                {loadingStatusLabel(state)}
              </p>
            ) : (
              <p style={css('margin: 0; color: #2A3036')} role="status">
                <strong>{listings.data?.total ?? 0}</strong> {listings.data?.total === 1 ? 'listing' : 'listings'}
                {browseIsFiltered(state) && <span className="mkt-hint"> · filtered</span>}
              </p>
            )}
            <div style={css('display: flex; align-items: center; gap: 10px')}>
              <label htmlFor="sort" style={css('font-size: 14px; color: #5B636B')}>
                Sort by
              </label>
              <select
                id="sort"
                className="field"
                value={state.sort}
                disabled={isUpdating}
                onChange={(event) => update({ sort: event.target.value as BrowseState['sort'] })}
                style={css('width: auto; height: 42px; cursor: pointer')}
              >
                <option value="recent">Newest first</option>
                <option value="title">Title (A–Z)</option>
                <option value="featured">Featured first</option>
              </select>
            </div>
          </div>

          {listings.error && !isUpdating && (
            <div role="alert" className="mkt-state" data-state="error">
              <p style={css('margin: 0 0 10px; font-weight: 600')}>{listings.error}</p>
              <button type="button" onClick={() => listings.reload()} className="btn-primary" style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                Retry
              </button>
            </div>
          )}

          {showEmpty && (
            <div style={css('background: #FFFFFF; border: 1px dashed #DAD7D0; border-radius: 18px; padding: 56px 24px; text-align: center')}>
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px")}>No listings match</h3>
              <p style={css('margin: 8px 0 20px; color: #5B636B')}>
                {browseIsFiltered(state)
                  ? 'Try a different category, city or search term.'
                  : 'Nothing has been published yet. Listings appear here as soon as our team publishes them.'}
              </p>
              <button type="button" onClick={() => router.push('/browse')} className="btn-primary" style={css('height: 46px; padding: 0 20px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                Clear filters
              </button>
            </div>
          )}

          {isUpdating ? (
            <>
              <span className="sr" role="status" aria-live="polite">
                {loadingStatusLabel(state)}
              </span>
              <BrowseListingSkeletonGrid />
            </>
          ) : (
            <div className="browse-grid">
              {resultListings.map((listing) => {
                const image = thumbUrl(listing);
                const title = listingCardTitle(listing);
                const price = listingCardPrice(listing);
                return (
                  <article key={listing.listingReference} className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column')}>
                    <Link
                      href={productPath(listing)}
                      aria-label={title}
                      style={css('position: relative; height: 170px; background: #F3F1EC; display: flex; align-items: center; justify-content: center; overflow: hidden')}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={listing.media.find((entry) => entry.assetId === listing.coverAssetId)?.alt.en ?? listing.title.en ?? 'Listing image'}
                          style={css('width: 100%; height: 100%; object-fit: cover')}
                          loading="lazy"
                        />
                      ) : (
                        <span className="mkt-hint">No image</span>
                      )}
                      <span style={css('position: absolute; left: 10px; top: 10px; padding: 4px 10px; border-radius: 999px; background: #FFFFFF; font-size: 12px; font-weight: 600; color: #2A3036')}>
                        {listing.listingMethod === 'auction' ? 'Auction listing' : listing.listingMethod === 'fixed_price' ? 'Fixed price' : 'Enquiry'}
                      </span>
                    </Link>
                    <div style={css('padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 6px')}>
                      <h3 style={css('margin: 0; font-size: 16px; font-weight: 700; line-height: 1.35; letter-spacing: 0.02em; text-transform: uppercase')}>
                        <Link href={productPath(listing)} style={css('color: #15191E')}>
                          {title}
                        </Link>
                      </h3>
                      <p style={css('margin: 4px 0 0; font-size: 13px; color: #5B636B')}>
                        {listing.location.label ?? 'Location not published'} · {postedLabel(listing.publishedAt)}
                      </p>
                      <p style={css('margin: 0; font-size: 13px; color: #5B636B')}>
                        {listing.condition ? listing.condition.replace('_', ' ') : 'Condition not stated'} · {listing.category.key}
                      </p>
                      {price ? (
                        <p style={css('margin: 2px 0 0; font-size: 18px; font-weight: 800; color: #9A6B12; letter-spacing: -0.01em')}>
                          {price.kind === 'starting' ? `Starting ${fmtMinor(price.minor)}` : fmtMinor(price.minor)}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!isUpdating && totalPages > 1 && (
            <nav aria-label="Pagination" style={css('display: flex; justify-content: center; gap: 8px; margin-top: 36px; flex-wrap: wrap')}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
                className="btn-ghost"
                style={css('height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid #E6E4DF; background: #FFFFFF; color: #15191E; font: inherit; font-weight: 600; cursor: pointer')}
              >
                ← Previous
              </button>
              {pages.map((entry, index) =>
                entry === '…' ? (
                  <span key={`gap-${index}`} style={css('width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #5B636B')}>
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    aria-current={entry === page ? 'page' : undefined}
                    onClick={() => update({ page: entry })}
                    style={css(`width: 44px; height: 44px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 1px solid ${entry === page ? '#15191E' : '#E6E4DF'}; background: ${entry === page ? '#15191E' : '#FFFFFF'}; color: ${entry === page ? '#FFFFFF' : '#15191E'}`)}
                  >
                    {entry}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => update({ page: page + 1 })}
                className="btn-ghost"
                style={css('height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid #E6E4DF; background: #FFFFFF; color: #15191E; font: inherit; font-weight: 600; cursor: pointer')}
              >
                Next →
              </button>
            </nav>
          )}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div style={css(PAGE_ROOT)}>
          <SiteHeader active="buy" />
          <div style={css('max-width: 1240px; margin: 0 auto; padding: 32px 24px 72px')}>
            <p className="browse-status-pulse" role="status" style={css('margin: 0 0 18px')}>
              Loading listings…
            </p>
            <BrowseListingSkeletonGrid />
          </div>
          <SiteFooter />
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
