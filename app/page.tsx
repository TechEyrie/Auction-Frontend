'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { appendPlaceQuery, useUiPlaceQueryKey } from '../lib/uiPlace';
import AudiencePicker from '../components/AudiencePicker';
import CategoryMenu from '../components/CategoryMenu';
import LocalInfoBar from '../components/LocalInfoBar';
import ProductListingCard from '../components/ProductListingCard';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../lib/api';
import { css, PAGE_ROOT } from '../lib/css';
import { useAsync } from '../lib/useAsync';
import { useChromeTranslate } from '../lib/siteChrome';
import { useUiLocale } from '../lib/UiLocaleProvider';
import { localizedText, type UiLang } from '../lib/uiLocale';
import { methodLabel, type MessageKey } from '../lib/uiMessages';
import { useLive } from '../lib/live';
import {
  mediaUrl,
  type ListingMethod,
  type Audience,
  type PublicListing,
} from '../lib/listings';
import { CategoryIcon } from '../lib/categoryIcons';
import './main.css';

/**
 * The homepage.
 *
 * Every listing and category shown here is read from the published catalogue: there is no demo
 * inventory. Live auction lots link to bid pages; the search box performs a real, shareable search.
 */

type Category = { key: string; name: string; parentKey: string | null; icon: string | null; listingMethods: ListingMethod[] };
type ListingsResponse = { listings: PublicListing[]; total: number };

const AUCTION_STEPS: Array<{ id: number; title: MessageKey; description: MessageKey }> = [
  { id: 1, title: 'home.step1Title', description: 'home.step1Desc' },
  { id: 2, title: 'home.step2Title', description: 'home.step2Desc' },
  { id: 3, title: 'home.step3Title', description: 'home.step3Desc' },
  { id: 4, title: 'home.step4Title', description: 'home.step4Desc' },
];

function cardImage(listing: PublicListing, lang: UiLang, fallbackAlt: string): { url: string | null; alt: string } {
  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId) ?? listing.media[0] ?? null;
  return {
    url: cover ? mediaUrl(API_BASE_URL, cover.url) : null,
    alt: (cover ? localizedText(cover.alt, lang) : '') || localizedText(listing.title, lang, fallbackAlt),
  };
}

export default function HomePage() {
  const router = useRouter();
  const { lang } = useUiLocale();
  const t = useChromeTranslate('home');
  const [auctionStep, setAuctionStep] = useState(0);
  const [search, setSearch] = useState('');
  const [heroCategory, setHeroCategory] = useState('');
  const [heroAudience, setHeroAudience] = useState<'' | Audience>('');
  const placeKey = useUiPlaceQueryKey();

  const featuredCarousel = useAsync<ListingsResponse>(
    () => apiFetch<ListingsResponse>(appendPlaceQuery('/api/listings?featured=true&sort=featured&limit=10'), { cache: 'no-store' }),
    [placeKey],
  );
  const endingSoon = useAsync<ListingsResponse>(
    () => apiFetch<ListingsResponse>(appendPlaceQuery('/api/listings?endingSoonHours=2&limit=20'), { cache: 'no-store' }),
    [placeKey],
  );
  const recent = useAsync<ListingsResponse>(
    () => apiFetch<ListingsResponse>(appendPlaceQuery('/api/listings?limit=8'), { cache: 'no-store' }),
    [placeKey],
  );
  const auctionListings = useAsync<ListingsResponse>(
    () => apiFetch<ListingsResponse>(appendPlaceQuery('/api/listings?method=auction&limit=4'), { cache: 'no-store' }),
    [placeKey],
  );
  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${lang}`, { cache: 'no-store' }),
    [lang],
  );
  useLive(() => {
    featuredCarousel.reload({ soft: true });
    endingSoon.reload({ soft: true });
    recent.reload({ soft: true });
    auctionListings.reload({ soft: true });
  });

  const roots = (categories.data?.categories ?? []).filter((category) => category.parentKey === null);
  const recentListings = (recent.data?.listings ?? []).slice(0, 8);
  const auctionCards = (auctionListings.data?.listings ?? []).slice(0, 4);
  const endingSoonListings = endingSoon.data?.listings ?? [];
  const featuredCarouselListings = featuredCarousel.data?.listings ?? [];

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{t('home.title')}</title>
      <SiteHeader home />

      <section id="top" className="home-hero-band">
        <div className="home-hero">
          <div className="home-hero__copy">
            <p className="home-hero__kicker">{t('home.badge')}</p>
            <h1 className="home-hero__title">
              {t('home.heroLine1')}
              <span className="home-hero__title-accent">{t('home.heroLine2')}</span>
            </h1>
            <p className="home-hero__lead">{t('home.heroLead')}</p>
            <nav className="home-hero__audience" aria-label={t('common.shopFor')}>
              <Link href="/browse?audience=men">{t('home.mensListings')}</Link>
              <Link href="/browse?audience=women">{t('home.womensListings')}</Link>
              <Link href="/browse?audience=unisex">{t('home.unisexListings')}</Link>
            </nav>
            <div className="home-hero__popular">
              <span className="home-hero__popular-label">{t('home.popular')}</span>
              <Link href="/browse?q=land+cruiser" className="home-chip">
                {t('home.landCruiser')}
              </Link>
              <Link href="/browse?q=iphone" className="home-chip">
                {t('home.iphone')}
              </Link>
              <Link href="/browse?method=auction" className="home-chip">
                {t('home.auctionListings')}
              </Link>
              <Link href="/browse?condition=used" className="home-chip">
                {t('home.usedItems')}
              </Link>
            </div>
          </div>

          <div className="home-hero-search">
            <span className="home-hero-search__brackets" aria-hidden="true" />
            <div className="home-hero-search__frame">
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
                  {t('home.searchLabel')}
                </label>
                <div className="mkt-search__query">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
                  </svg>
                  <input
                    id="q"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('home.searchPlaceholder')}
                    autoComplete="off"
                  />
                </div>
                <CategoryMenu
                  value={heroCategory}
                  onChange={setHeroCategory}
                  options={roots.map((category) => ({ key: category.key, name: category.name }))}
                />
                <button type="submit" className="mkt-search__submit">
                  {t('common.search')}
                </button>
              </form>
              <div className="home-hero-search__shop">
                <p className="home-hero-search__shop-label">{t('common.shopFor')}</p>
                <AudiencePicker
                  value={heroAudience}
                  onChange={(audience) => {
                    setHeroAudience(audience);
                    const params = new URLSearchParams();
                    if (search.trim()) params.set('q', search.trim());
                    if (audience) params.set('audience', audience);
                    if (heroCategory) params.set('category', heroCategory);
                    router.push(params.toString() ? `/browse?${params.toString()}` : '/browse');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <LocalInfoBar />

      <section className="home-section" aria-label={t('home.endingSoonTitle')}>
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 28px')}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
              {t('home.endingSoonTitle')}
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>{t('home.endingSoonSub')}</p>
          </div>
        </div>
        {endingSoonListings.length === 0 ? (
          <p className="mkt-state">
            {endingSoon.error
              ? t('home.endingSoonError', { error: endingSoon.error })
              : endingSoon.loading
                ? t('home.endingSoonLoading')
                : t('home.endingSoonEmpty')}
          </p>
        ) : (
          <div className="plc-grid">
            {endingSoonListings.map((listing) => {
              const image = cardImage(listing, lang, t('common.listingImage'));
              return (
                <ProductListingCard
                  key={listing.listingReference}
                  listing={listing}
                  imageUrl={image.url}
                  imageAlt={image.alt}
                />
              );
            })}
          </div>
        )}
      </section>

      {featuredCarouselListings.length > 0 && (
        <section className="home-section" aria-label={t('home.featuredCarouselTitle')}>
          <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 28px')}>
            <div>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
                {t('home.featuredCarouselTitle')}
              </h2>
              <p style={css('margin: 6px 0 0; color: #5B636B')}>{t('home.featuredCarouselSub')}</p>
            </div>
          </div>
          <div className="plc-grid">
            {featuredCarouselListings.map((listing) => {
              const image = cardImage(listing, lang, t('common.listingImage'));
              return (
                <ProductListingCard
                  key={listing.listingReference}
                  listing={listing}
                  imageUrl={image.url}
                  imageAlt={image.alt}
                />
              );
            })}
          </div>
        </section>
      )}

      <section id="categories" className="home-section">
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 28px')}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>
              {t('home.categoriesTitle')}
            </h2>
            <p style={css('margin: 6px 0 0; color: var(--mkt-muted)')}>{t('home.categoriesSub')}</p>
          </div>
          <Link href="/categories" style={css('font-weight: 600')}>
            {t('home.allCategoriesLink')}
          </Link>
        </div>

        {categories.error && (
          <p role="alert" className="mkt-state" data-state="error">
            {t('home.categoriesError', { error: categories.error })}
          </p>
        )}
        {!categories.error && roots.length === 0 && (
          <p className="mkt-state">{categories.loading ? t('home.categoriesLoading') : t('home.categoriesEmpty')}</p>
        )}

        <div className="cat-grid">
          {roots.map((category) => (
            <Fragment key={category.key}>
              <Link
                href={`/browse?category=${encodeURIComponent(category.key)}`}
                className="cat"
                style={css('display: flex; flex-direction: column; gap: 14px; padding: 20px; background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 16px; color: var(--mkt-text); transition: border-color .15s, background .15s')}
              >
                <span className="cat__icon" style={css('width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center')}>
                  <CategoryIcon icon={category.icon} size={22} />
                </span>
                <span>
                  <span className="cat__name" style={css('display: block; font-weight: 600; font-size: 16px')}>{category.name}</span>
                  <span className="cat__meta" style={css('display: block; font-size: 13px')}>
                    {category.listingMethods.map((method) => methodLabel(lang, method)).join(' · ')}
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
              {t('home.auctionsTitle')}
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>
              {t('home.auctionsSub')}
            </p>
          </div>
          <Link href="/auctions" style={css('font-weight: 600')}>
            {t('home.auctionOverview')}
          </Link>
        </div>

        {auctionListings.error && (
          <p role="alert" className="mkt-state" data-state="error">
            {t('home.auctionsError', { error: auctionListings.error })}
          </p>
        )}
        {!auctionListings.error && auctionCards.length === 0 && (
          <p className="mkt-state">{auctionListings.loading ? t('home.auctionsLoading') : t('home.auctionsEmpty')}</p>
        )}

        <div className="plc-grid">
          {auctionCards.map((listing) => {
            const image = cardImage(listing, lang, t('common.listingImage'));
            return (
              <ProductListingCard
                key={listing.listingReference}
                listing={listing}
                imageUrl={image.url}
                imageAlt={image.alt}
              />
            );
          })}
        </div>
      </section>

      <section id="how" className="home-section how-auction">
        <header className="how-auction__header">
          <h2 className="how-auction__title">{t('home.howTitle')}</h2>
          <p className="how-auction__subtitle">
            {t('home.howSubtitle')}
          </p>
        </header>
        <div className="how-auction__body">
          <div className="how-auction__media">
            <img
              src="/how_our_auctions_work.jpg"
              alt={t('home.howImageAlt')}
              width={720}
              height={720}
              loading="lazy"
            />
          </div>
          <div className="how-auction__steps-wrap">
            <ol className="how-auction__steps" aria-label={t('home.stepsAria')}>
              {AUCTION_STEPS.map((step, index) => {
                const active = auctionStep === index;
                return (
                  <li key={step.id}>
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
                        <span className="how-auction__step-title">{t(step.title)}</span>
                        <span className="how-auction__step-desc">{t(step.description)}</span>
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
                  key={step.id}
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
              {t('home.freshTitle')}
            </h2>
            <p style={css('margin: 6px 0 0; color: #5B636B')}>{t('home.freshSub')}</p>
          </div>
          <Link href="/browse" style={css('font-weight: 600')}>
            {t('home.viewAll')}
          </Link>
        </div>

        {recent.error && (
          <p role="alert" className="mkt-state" data-state="error">
            {t('home.listingsError', { error: recent.error })}
          </p>
        )}
        {!recent.error && recentListings.length === 0 && (
          <p className="mkt-state">{recent.loading ? t('home.listingsLoading') : t('home.listingsEmpty')}</p>
        )}

        <div className="plc-grid">
          {recentListings.map((listing) => {
            const image = cardImage(listing, lang, t('common.listingImage'));
            return (
              <ProductListingCard
                key={listing.listingReference}
                listing={listing}
                imageUrl={image.url}
                imageAlt={image.alt}
              />
            );
          })}
        </div>
      </section>

      <section id="sell" className="home-section">
        <div style={css('background: #9A6B12; color: #FFFFFF; border-radius: 24px; padding: clamp(28px, 5vw, 56px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between')}>
          <div style={css('flex: 1 1 420px; min-width: 0')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(28px, 3.4vw, 40px); letter-spacing: -0.025em; font-weight: 700; line-height: 1.1")}>
              {t('home.sellTitle')}
            </h2>
            <p style={css('margin: 12px 0 0; font-size: 18px; color: #F6EAD0; max-width: 48ch')}>
              {t('home.sellBody')}
            </p>
          </div>
          <div style={css('display: flex; flex-wrap: wrap; gap: 12px')}>
            <Link href="/contact" style={css('height: 52px; padding: 0 24px; border-radius: 12px; background: #FFFFFF; color: #9A6B12; font-weight: 700; display: flex; align-items: center')}>
              {t('home.talkToTeam')}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section" style={css('padding-top: 56px; padding-bottom: 80px')}>
        <div className="home-trust">
          <div style={css('display: flex; gap: 14px')}>
            <span style={css('flex: 0 0 44px; height: 44px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4"></path>
              </svg>
            </span>
            <div>
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>{t('home.trust1Title')}</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                {t('home.trust1Body')}
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
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>{t('home.trust2Title')}</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                {t('home.trust2Body')}
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
              <h3 style={css('margin: 0; font-size: 17px; font-weight: 600')}>{t('home.trust3Title')}</h3>
              <p style={css('margin: 4px 0 0; color: #5B636B; font-size: 15px')}>
                {t('home.trust3Body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
