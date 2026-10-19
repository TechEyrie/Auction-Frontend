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
import { useUiLocale } from '../../lib/UiLocaleProvider';
import { categoryByKey, categoryChildren, categoryRoots } from '../../lib/catalog';
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
      <title>All categories — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="categories" />

      <section style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 40px var(--mkt-gutter-x) 40px; display: flex; flex-wrap: wrap; gap: 24px; align-items: end; justify-content: space-between')}>
          <div>
            <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; margin-bottom: 10px')}>
              <Link href="/">Home</Link> <span aria-hidden="true">/</span>{' '}
              <Link href={categoriesHref()}>Categories</Link>
              {parentCat && (
                <>
                  {' '}
                  <span aria-hidden="true">/</span> {parentCat.name}
                </>
              )}
            </nav>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4vw, 3rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>
              All categories
            </h1>
            <p style={css('margin: 8px 0 0; color: #5B636B; font-size: 18px')}>
              Pick a category to browse the published listings inside it.
            </p>
          </div>
          <div style={css('flex: 0 1 420px; min-width: 0; display: flex; align-items: center; gap: 10px; height: 54px; padding: 0 16px; border: 1px solid #DAD7D0; border-radius: 14px; background: #FFFFFF')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B636B" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
            </svg>
            <label htmlFor="cq" className="sr">
              Find a category
            </label>
            <input
              id="cq"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a category, e.g. phones"
              style={css('flex: 1; min-width: 0; height: 48px; border: 0; font: inherit; font-size: 16px; background: transparent; outline-offset: 6px')}
            />
          </div>
        </div>
      </section>

      <section style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 40px var(--mkt-gutter-x) 24px')}>
        <div style={css('margin-bottom: 28px; max-width: 520px')}>
          <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #5B636B')}>Shop for</p>
          <AudiencePicker
            value={audience}
            onChange={(next) => pushCategories({ audience: next })}
          />
        </div>
        {categories.loading && (
          <p role="status" className="mkt-state" data-state="loading">
            Loading categories…
          </p>
        )}

        {categories.error && (
          <div role="alert" className="mkt-state" data-state="error">
            <p style={css('margin: 0 0 10px; font-weight: 600')}>{categories.error}</p>
            <button type="button" onClick={() => categories.reload()} className="btn-primary" style={css('height: 42px; padding: 0 16px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
              Retry
            </button>
          </div>
        )}

        {!categories.loading && !categories.error && visibleRoots.length === 0 && (
          <div style={css('background: #FFFFFF; border: 1px dashed #DAD7D0; border-radius: 18px; padding: 48px 24px; text-align: center')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px")}>
              {q ? `No category matches "${q}"` : 'No categories are published yet'}
            </h2>
            <p style={css('margin: 8px 0 0; color: #5B636B')}>
              {q ? (
                <>
                  Try a shorter word, or <Link href="/browse" style={css('font-weight: 600')}>search all listings</Link>.
                </>
              ) : (
                'Our team publishes the catalogue in the admin tools; empty categories are not invented here.'
              )}
            </p>
          </div>
        )}

        <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px')}>
          {visibleRoots.map((root) => {
            const kids = visibleChildrenForRoot(root);
            const highlight = parentCat?.key === root.key;
            const isExpanded = expandedRoots.has(root.key) || (Boolean(q) && kids.length > 0);
            return (
              <article
                key={root.key}
                id={highlight ? `category-${root.key}` : undefined}
                style={css(
                  `background: #FFFFFF; border: 1px solid ${highlight ? '#9A6B12' : '#E6E4DF'}; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px${highlight ? '; box-shadow: 0 0 0 1px rgba(154,107,18,.12)' : ''}`,
                )}
              >
                <div style={css('display: flex; gap: 14px; align-items: flex-start')}>
                  <span style={css('flex: 0 0 48px; height: 48px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #7D5610')}>
                    {root.name.slice(0, 1)}
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

      <section style={css('max-width: var(--mkt-shell-max); margin: 0 auto; padding: 40px var(--mkt-gutter-x) 80px')}>
        <div style={css('background: #15191E; color: #FFFFFF; border-radius: 24px; padding: clamp(28px, 5vw, 48px); display: flex; flex-wrap: wrap; gap: 24px; align-items: center; justify-content: space-between')}>
          <div style={css('flex: 1 1 420px; min-width: 0')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(26px, 3vw, 34px); letter-spacing: -0.02em; font-weight: 700")}>
              Can&apos;t find what you need?
            </h2>
            <p style={css('margin: 10px 0 0; font-size: 17px; color: #C9CFCB')}>
              Send us an enquiry and our team will look through the inventory with you.
            </p>
          </div>
          <Link href="/contact" className="btn-primary" style={css('height: 52px; padding: 0 24px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; display: flex; align-items: center')}>
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

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div style={css(PAGE_ROOT)}>
          <SiteHeader active="categories" />
          <p role="status" className="mkt-state" data-state="loading" style={css('max-width: var(--mkt-shell-max); margin: 32px auto; padding: 18px')}>
            Loading categories…
          </p>
          <SiteFooter />
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
