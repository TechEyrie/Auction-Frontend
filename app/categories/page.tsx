'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import AudiencePicker from '../../components/AudiencePicker';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useAsync } from '../../lib/useAsync';
import { EMPTY_BROWSE, METHOD_LABEL, browseQuery, parseBrowseState, type ListingMethod } from '../../lib/listings';
import './categories.css';

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
export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audience = parseBrowseState(new URLSearchParams(searchParams.toString())).audience;
  const [query, setQuery] = useState('');
  const categories = useAsync<{ categories: Category[] }>(() => apiFetch<{ categories: Category[] }>('/api/catalog/categories', { cache: 'no-store' }), []);

  function browseHref(categoryKey: string): string {
    const qs = browseQuery({ ...EMPTY_BROWSE, audience, category: categoryKey });
    return qs ? `/browse?${qs}` : '/browse';
  }

  const all = categories.data?.categories ?? [];
  // Sub-categories hidden for now; restore when client wants depth.
  const roots = all.filter((category) => category.parentKey === null);
  const q = query.trim().toLowerCase();

  const matches = (category: Category): boolean =>
    !q || category.name.toLowerCase().includes(q) || category.key.includes(q);

  const visible = roots.filter(matches);

  return (
    <div style={css(PAGE_ROOT)}>
      <title>All categories — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="categories" />

      <section style={css('background: #FFFFFF; border-bottom: 1px solid #E6E4DF')}>
        <div style={css('max-width: 1240px; margin: 0 auto; padding: 40px 24px 40px; display: flex; flex-wrap: wrap; gap: 24px; align-items: end; justify-content: space-between')}>
          <div>
            <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; margin-bottom: 10px')}>
              <Link href="/">Home</Link> <span aria-hidden="true">/</span> Categories
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

      <section style={css('max-width: 1240px; margin: 0 auto; padding: 40px 24px 24px')}>
        <div style={css('margin-bottom: 28px; max-width: 520px')}>
          <p style={css('margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #5B636B')}>Shop for</p>
          <AudiencePicker
            value={audience}
            onChange={(next) => {
              const params = new URLSearchParams(searchParams.toString());
              if (next) params.set('audience', next);
              else params.delete('audience');
              const qs = params.toString();
              router.push(qs ? `/categories?${qs}` : '/categories');
            }}
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

        {!categories.loading && !categories.error && visible.length === 0 && (
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
          {visible.map((root) => (
            <article key={root.key} style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 16px')}>
              <div style={css('display: flex; gap: 14px; align-items: center')}>
                <span style={css('flex: 0 0 48px; height: 48px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #7D5610')}>
                  {root.name.slice(0, 1)}
                </span>
                <div style={css('min-width: 0; flex: 1')}>
                  <h2 style={css('margin: 0; font-size: 18px; font-weight: 700')}>
                    <Link href={browseHref(root.key)} style={css('color: #15191E')}>
                      {root.name}
                    </Link>
                  </h2>
                  <p className="mkt-hint" style={css('margin-top: 2px')}>
                    {root.listingMethods.map((method) => METHOD_LABEL[method]).join(' · ')}
                  </p>
                </div>
              </div>
              {root.description && <p className="mkt-hint">{root.description}</p>}
              {/* Sub-categories hidden for now; restore when client wants depth. */}
              <Link href={browseHref(root.key)} style={css('margin-top: auto; font-weight: 600; font-size: 14px')}>
                View all in {root.name} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section style={css('max-width: 1240px; margin: 0 auto; padding: 40px 24px 80px')}>
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
