'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import AudiencePicker from '../../components/AudiencePicker';
import BrowseFilterBar, { clearBarFilterPatch } from '../../components/BrowseFilterBar';
import ProductListingCard from '../../components/ProductListingCard';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useAsync } from '../../lib/useAsync';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import { categoryRoots } from '../../lib/catalog';
import {
  applyBrowseChange,
  browseIsFiltered,
  browseQuery,
  coverImage,
  parseBrowseState,
  mediaUrl,
  type BrowseState,
  type ListingMethod,
  type PublicListing,
} from '../../lib/listings';
import './browse.css';

type Category = { key: string; name: string; parentKey: string | null; depth: number; icon: string | null; listingMethods: ListingMethod[] };
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

type Translate = ReturnType<typeof useUiLocale>['t'];

function loadingStatusLabel(state: BrowseState, t: Translate): string {
  if (state.q) return t('browse.searching');
  if (browseIsFiltered(state)) return t('browse.filtering');
  return t('browse.loading');
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
  const { lang, t } = useUiLocale();
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
    if (state.area) params.set('area', state.area);
    if (state.featured) params.set('featured', 'true');
    if (state.sort !== 'recent') params.set('sort', state.sort);
    params.set('page', String(state.page));
    params.set('limit', '12');
    return params.toString();
  }, [state]);

  const listings = useAsync<ListingsResponse>(() => apiFetch<ListingsResponse>(`/api/listings?${query}`, { cache: 'no-store' }), [query]);
  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${lang}`, { cache: 'no-store' }),
    [lang],
  );
  const [searchText, setSearchText] = useState(state.q);
  /** True from filter click until the matching listings request finishes — avoids stale cards during navigation. */
  const [filterPending, setFilterPending] = useState(false);

  useEffect(() => {
    setSearchText(state.q);
  }, [state.q]);

  useEffect(() => {
    setFilterPending(true);
  }, [query]);

  useEffect(() => {
    if (!listings.loading) setFilterPending(false);
  }, [listings.loading]);

  /** Every filter change is navigation: the URL is the state, so reload and Back/Forward work. */
  function update(change: Partial<BrowseState>): void {
    const next = applyBrowseChange(state, change);
    const qs = browseQuery(next);
    const href = qs ? `/browse?${qs}` : '/browse';
    const currentHref = browseQuery(state) ? `/browse?${browseQuery(state)}` : '/browse';
    if (href === currentHref) return;
    setFilterPending(true);
    router.push(href, { scroll: false });
  }

  const allCategories = categories.data?.categories ?? [];
  const roots = categoryRoots(allCategories);
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
  const resultListings = listings.data?.listings ?? [];
  const showInitialSkeleton = isUpdating;
  const showEmpty = !isUpdating && !listings.error && resultListings.length === 0;

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{t('browse.title')}</title>
      <SiteHeader active="buy" />

      <section style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 28px var(--mkt-gutter-x) 32px')}>
          <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; margin-bottom: 10px')}>
            <Link href="/">{t('common.home')}</Link> <span aria-hidden="true">/</span> {t('browse.breadcrumb')}
          </nav>
          <div style={css('display: flex; flex-wrap: wrap; gap: 20px; align-items: end; justify-content: space-between')}>
            <div>
              <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2rem, 3.6vw, 2.75rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.1")}>
                {t('browse.h1')}
              </h1>
              <p style={css('margin: 8px 0 0; color: #5B636B')}>
                {t('browse.lead')}
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
                {t('browse.searchLabel')}
              </label>
              <input
                id="bq"
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={t('browse.searchPlaceholder')}
                style={css('flex: 1; min-width: 0; height: 44px; border: 0; padding: 0 12px; font: inherit; font-size: 15px; background: transparent')}
              />
              <button type="submit" className="btn-primary" style={css('height: 44px; padding: 0 20px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                {t('common.search')}
              </button>
            </form>
          </div>
          <div style={css('margin-top: 22px; max-width: 520px')}>
            <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #5B636B')}>{t('common.shopFor')}</p>
            <AudiencePicker value={state.audience} onChange={(audience) => update({ audience })} />
          </div>
        </div>
      </section>

      <div className="browse-layout" style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 32px var(--mkt-gutter-x) 72px')}>
        <BrowseFilterBar
          state={state}
          onChange={update}
          disabled={isUpdating}
          allCategories={allCategories}
          roots={roots}
          categoriesError={Boolean(categories.error)}
        />

        <main aria-busy={isUpdating}>
          <div className="browse-results-meta">
            {isUpdating ? (
              <p className="browse-status-pulse" role="status" aria-live="polite">
                {loadingStatusLabel(state, t)}
              </p>
            ) : (
              <p style={css('margin: 0; color: #2A3036')} role="status">
                <strong>{listings.data?.total ?? 0}</strong> {listings.data?.total === 1 ? t('browse.listing') : t('browse.listings')}
                {browseIsFiltered(state) && <span className="mkt-hint">{t('browse.filtered')}</span>}
              </p>
            )}
            <Link href="/auctions" className="browse-auctions-link">
              {t('browse.auctionPromoBody')}
            </Link>
          </div>

          {listings.error && !isUpdating && (
            <div role="alert" className="mkt-state" data-state="error">
              <p style={css('margin: 0 0 10px; font-weight: 600')}>{listings.error}</p>
              <button type="button" onClick={() => listings.reload()} className="btn-primary" style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                {t('common.retry')}
              </button>
            </div>
          )}

          {showEmpty && (
            <div style={css('background: #FFFFFF; border: 1px dashed #DAD7D0; border-radius: 18px; padding: 56px 24px; text-align: center')}>
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px")}>{t('browse.emptyTitle')}</h3>
              <p style={css('margin: 8px 0 20px; color: #5B636B')}>
                {browseIsFiltered(state)
                  ? t('browse.emptyFiltered')
                  : t('browse.emptyNone')}
              </p>
              <button type="button" onClick={() => update(clearBarFilterPatch())} className="btn-primary" style={css('height: 46px; padding: 0 20px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                {t('browse.clearFilters')}
              </button>
            </div>
          )}

          {showInitialSkeleton ? (
            <>
              <span className="sr" role="status" aria-live="polite">
                {loadingStatusLabel(state, t)}
              </span>
              <BrowseListingSkeletonGrid />
            </>
          ) : (
            <div className="browse-grid">
              {resultListings.map((listing) => (
                <ProductListingCard key={listing.listingReference} listing={listing} imageUrl={thumbUrl(listing)} />
              ))}
            </div>
          )}

          {!isUpdating && totalPages > 1 && (
            <nav aria-label={t('browse.pagination')} style={css('display: flex; justify-content: center; gap: 8px; margin-top: 36px; flex-wrap: wrap')}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 })}
                className="btn-ghost"
                style={css('height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid #E6E4DF; background: #FFFFFF; color: #15191E; font: inherit; font-weight: 600; cursor: pointer')}
              >
                {t('browse.previous')}
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
                {t('browse.next')}
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
  const { t } = useUiLocale();
  return (
    <Suspense
      fallback={
        <div style={css(PAGE_ROOT)}>
          <SiteHeader active="buy" />
          <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 32px var(--mkt-gutter-x) 72px')}>
            <p className="browse-status-pulse" role="status" style={css('margin: 0 0 18px')}>
              {t('browse.loading')}
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
