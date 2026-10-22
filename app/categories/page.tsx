'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AudiencePicker from '../../components/AudiencePicker';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useAsync } from '../../lib/useAsync';
import { useChromeTranslate } from '../../lib/siteChrome';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import { categoryByKey, categoryChildren, categoryRoots } from '../../lib/catalog';
import { CategoryIcon } from '../../lib/categoryIcons';
import { EMPTY_BROWSE, METHOD_LABEL, browseQuery, parseBrowseState, type ListingMethod } from '../../lib/listings';
import { CategoryTreeExpandControl } from '../../components/CategoryTree';
import '../../components/category-tree.css';
import './categories.css';

const CATEGORY_KEY = /^[a-z][a-z0-9-]{1,59}$/;

type Category = {
  key: string;
  name: string;
  description: string | null;
  parentKey: string | null;
  depth: number;
  icon: string | null;
  listingMethods: ListingMethod[];
};

/**
 * The category tree.
 *
 * Categories come from the taxonomy the admin edits — there is no second, hard-coded list, so a
 * category created or archived in the admin appears or disappears here after a reload. Each link
 * carries the canonical category key, so the browse page's filters are shareable URLs rather than
 * component state.
 */
function CategoriesContent() {
  const { lang } = useUiLocale();
  const ct = useChromeTranslate('categories');
  const router = useRouter();
  const searchParams = useSearchParams();
  const audience = parseBrowseState(new URLSearchParams(searchParams.toString())).audience;
  const parentParam = firstValue(searchParams, 'parent').toLowerCase();
  const [query, setQuery] = useState('');
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(() => new Set());
  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${lang}`, { cache: 'no-store' }),
    [lang],
  );

  function browseHref(categoryKey: string): string {
    const qs = browseQuery({ ...EMPTY_BROWSE, audience, category: categoryKey });
    return qs ? `/browse?${qs}` : '/browse';
  }

  function categoriesHref(parent?: string): string {
    const params = new URLSearchParams();
    if (audience) params.set('audience', audience);
    if (parent) params.set('parent', parent);
    const qs = params.toString();
    return qs ? `/categories?${qs}` : '/categories';
  }

  const all = categories.data?.categories ?? [];
  const parentCat =
    parentParam && CATEGORY_KEY.test(parentParam) ? categoryByKey(all, parentParam) : undefined;
  const roots = categoryRoots(all);
  const q = query.trim().toLowerCase();

  function categoryMatches(category: Category): boolean {
    return !q || category.name.toLowerCase().includes(q) || category.key.includes(q);
  }

  function visibleChildrenForRoot(root: Category): Category[] {
    const kids = categoryChildren(all, root.key);
    if (!q) return kids;
    if (categoryMatches(root)) return kids;
    return kids.filter(categoryMatches);
  }

  const visibleRoots = roots.filter((root) => {
    if (!q) return true;
    if (categoryMatches(root)) return true;
    return visibleChildrenForRoot(root).length > 0;
  });

  useEffect(() => {
    if (!parentCat) return;
    document.getElementById(`category-${parentCat.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [parentCat?.key]);

  function toggleRootExpanded(rootKey: string): void {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootKey)) next.delete(rootKey);
      else next.add(rootKey);
      return next;
    });
  }

  function pushCategories(next: { audience?: '' | typeof audience; parent?: string }): void {
    const params = new URLSearchParams();
    const nextAudience = next.audience !== undefined ? next.audience : audience;
    if (nextAudience) params.set('audience', nextAudience);
    const parent = next.parent !== undefined ? next.parent : parentParam;
    if (parent && CATEGORY_KEY.test(parent)) params.set('parent', parent);
    const qs = params.toString();
    router.push(qs ? `/categories?${qs}` : '/categories');
  }

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{ct('categories.title')}</title>
      <SiteHeader active="categories" />

      <section className="categories-hero">
        <div className="categories-hero__inner">
          <div>
            <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: var(--mkt-muted); margin-bottom: 10px')}>
              <Link href="/">Home</Link> <span aria-hidden="true">/</span>{' '}
              <Link href={categoriesHref()}>{ct('categories.breadcrumb')}</Link>
              {parentCat && (
                <>
                  {' '}
                  <span aria-hidden="true">/</span> {parentCat.name}
                </>
              )}
            </nav>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4vw, 3rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>
              {ct('categories.h1')}
            </h1>
            <p style={css('margin: 8px 0 0; color: var(--mkt-muted); font-size: 18px')}>
              {ct('categories.lead')}
            </p>
          </div>
          <div className="categories-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
            </svg>
            <label htmlFor="cq" className="sr">
              {ct('categories.searchLabel')}
            </label>
            <input
              id="cq"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ct('categories.searchPlaceholder')}
            />
          </div>
        </div>
      </section>

      <section className="categories-body">
        <div style={css('margin-bottom: 28px; max-width: 520px')}>
          <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--mkt-muted)')}>{ct('categories.shopFor')}</p>
          <AudiencePicker
            value={audience}
            onChange={(next) => pushCategories({ audience: next })}
          />
        </div>
        {categories.loading && (
          <p role="status" className="mkt-state" data-state="loading">
            {ct('categories.loading')}
          </p>
        )}

        {categories.error && (
          <div role="alert" className="mkt-state" data-state="error">
            <p style={css('margin: 0 0 10px; font-weight: 600')}>{categories.error}</p>
            <button type="button" onClick={() => categories.reload()} className="btn-primary" style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
              {ct('categories.retry')}
            </button>
          </div>
        )}

        {!categories.loading && !categories.error && visibleRoots.length === 0 && (
          <div className="categories-empty">
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px")}>
              {q ? ct('categories.emptySearch', { q }) : ct('categories.emptyTitle')}
            </h2>
            <p style={css('margin: 8px 0 0; color: var(--mkt-muted)')}>
              {q ? (
                <>
                  {ct('categories.emptySearchHintPrefix')}
                  <Link href="/browse" style={css('font-weight: 600')}>{ct('categories.emptySearchLink')}</Link>
                  {ct('categories.emptySearchHintSuffix')}
                </>
              ) : (
                ct('categories.emptyNone')
              )}
            </p>
          </div>
        )}

        <div className="categories-grid">
          {visibleRoots.map((root) => {
            const kids = visibleChildrenForRoot(root);
            const highlight = parentCat?.key === root.key;
            const isExpanded = expandedRoots.has(root.key) || (Boolean(q) && kids.length > 0);
            return (
              <article
                key={root.key}
                id={highlight ? `category-${root.key}` : undefined}
                className={highlight ? 'categories-card is-highlight' : 'categories-card'}
              >
                <div style={css('display: flex; gap: 14px; align-items: flex-start')}>
                  <span className="categories-card__icon">
                    <CategoryIcon icon={root.icon} size={26} />
                  </span>
                  <div style={css('min-width: 0; flex: 1')}>
                    <p className="mkt-hint" style={css('margin: 0 0 4px')}>
                      {root.listingMethods.map((method) => METHOD_LABEL[method]).join(' · ')}
                    </p>
                    {root.description && <p className="mkt-hint" style={css('margin: 0 0 8px')}>{root.description}</p>}
                    <nav className="category-tree category-tree--card" aria-label={root.name}>
                      <div className="category-tree__group">
                        <div className="category-tree__root-line">
                          <Link href={browseHref(root.key)} className="category-tree__row category-tree__row--root">
                            {root.name}
                          </Link>
                          {kids.length > 0 && (
                            <CategoryTreeExpandControl
                              expanded={isExpanded}
                              onToggle={() => toggleRootExpanded(root.key)}
                              label={root.name}
                            />
                          )}
                        </div>
                        {kids.length > 0 ? (
                          isExpanded ? (
                            <ul className="category-tree__children">
                              {kids.map((child) => (
                                <li key={child.key} className="category-tree__child-wrap">
                                  <Link href={browseHref(child.key)} className="category-tree__row category-tree__row--child">
                                    {child.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null
                        ) : (
                          <Link href={browseHref(root.key)} style={css('display: inline-block; margin-top: 4px; font-weight: 600; font-size: 14px')}>
                            View all →
                          </Link>
                        )}
                      </div>
                    </nav>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="categories-cta">
        <div className="categories-cta-panel">
          <div style={css('flex: 1 1 420px; min-width: 0')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(26px, 3vw, 34px); letter-spacing: -0.02em; font-weight: 700")}>
              Can&apos;t find what you need?
            </h2>
            <p style={css('margin: 10px 0 0; font-size: 17px; color: var(--mkt-hero-feature-muted)')}>
              Send us an enquiry and our team will look through the inventory with you.
            </p>
          </div>
          <Link href="/contact" className="btn-primary" style={css('height: 52px; padding: 0 24px; border-radius: 12px; background: var(--mkt-gold); color: #FFFFFF; font-weight: 700; display: flex; align-items: center')}>
            Contact the team
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function firstValue(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  return value === null ? '' : value.trim();
}

function CategoriesFallback() {
  const ct = useChromeTranslate('categories');
  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader active="categories" />
      <p role="status" className="mkt-state" data-state="loading" style={css('max-width: var(--mkt-shell-max); margin: 32px auto; padding: 18px')}>
        {ct('categories.loading')}
      </p>
      <SiteFooter />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesFallback />}>
      <CategoriesContent />
    </Suspense>
  );
}
