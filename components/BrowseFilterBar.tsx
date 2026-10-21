'use client';

import { useEffect, useRef, useState } from 'react';
import { browseParentAndSub, categoryChildren } from '../lib/catalog';
import { useUiLocale } from '../lib/UiLocaleProvider';
import { conditionLabel, methodLabel } from '../lib/uiMessages';
import {
  LISTING_METHODS,
  type BrowseState,
  type ListingMethod,
} from '../lib/listings';

type Category = { key: string; name: string; parentKey: string | null; depth: number; icon: string | null; listingMethods: ListingMethod[] };

type DropdownId = 'category' | 'subcategory' | 'type' | 'condition' | 'sort';

const DROPDOWN_CONDITIONS = ['like_new', 'used', 'refurbished'] as const;

export function barFiltersActive(state: BrowseState): boolean {
  return Boolean(
    state.q ||
      state.audience ||
      state.category ||
      state.method ||
      state.condition ||
      state.featured ||
      state.endsOn ||
      state.sort !== 'recent',
  );
}

export function clearBarFilterPatch(): Partial<BrowseState> {
  return {
    q: '',
    audience: '',
    category: '',
    method: '',
    condition: '',
    featured: false,
    sort: 'recent',
    endsOn: '',
    page: 1,
  };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`browse-bar__chevron${open ? ' browse-bar__chevron--open' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BrowseFilterBarProps = {
  state: BrowseState;
  onChange: (change: Partial<BrowseState>) => void;
  disabled?: boolean;
  allCategories: Category[];
  roots: Category[];
  categoriesError?: boolean;
};

export default function BrowseFilterBar({
  state,
  onChange,
  disabled = false,
  allCategories,
  roots,
  categoriesError,
}: BrowseFilterBarProps) {
  const { lang, t } = useUiLocale();
  const barRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<DropdownId | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }
    function onPointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (barRef.current && !barRef.current.contains(target)) setOpenMenu(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [openMenu]);

  const { parentKey: categoryParentKey, subcategoryKey } = browseParentAndSub(allCategories, state.category);
  const subcategories = categoryParentKey ? categoryChildren(allCategories, categoryParentKey) : [];
  const categoryParentName = categoryParentKey
    ? allCategories.find((c) => c.key === categoryParentKey)?.name ?? categoryParentKey
    : null;
  const subcategoryDisabled =
    disabled || !categoryParentKey || subcategories.length === 0;
  const subcategoryTriggerLabel = !categoryParentKey
    ? t('browse.subcategory')
    : subcategories.length === 0
      ? t('browse.noSubcategories')
      : subcategoryKey
        ? allCategories.find((c) => c.key === subcategoryKey)?.name ?? subcategoryKey
        : t('browse.allSubcategories');

  const typeLabel = state.method ? methodLabel(lang, state.method) : t('browse.filterType');
  const conditionFromDropdown =
    state.condition && state.condition !== 'new' ? state.condition : '';
  const conditionTriggerLabel = conditionFromDropdown
    ? conditionLabel(lang, conditionFromDropdown)
    : t('browse.condition');
  const sortLabels: Record<BrowseState['sort'], string> = {
    recent: t('browse.sortRecent'),
    title: t('browse.sortTitle'),
    featured: t('browse.sortFeatured'),
  };

  function toggleMenu(id: DropdownId) {
    setOpenMenu((current) => (current === id ? null : id));
  }

  const newActive = state.condition === 'new';
  const featuredActive = state.featured;

  return (
    <div className="browse-bar-wrap">
      <div ref={barRef} className="browse-bar" role="toolbar" aria-label={t('browse.filters')}>
        <button
          type="button"
          className={`browse-bar__pill${newActive ? ' is-selected' : ''}`}
          aria-pressed={newActive}
          disabled={disabled}
          onClick={() => onChange({ condition: newActive ? '' : 'new' })}
        >
          {t('browse.filterNew')}
        </button>

        <button
          type="button"
          className={`browse-bar__pill${featuredActive ? ' is-selected' : ''}`}
          aria-pressed={featuredActive}
          disabled={disabled}
          onClick={() => onChange({ featured: !featuredActive })}
        >
          {t('browse.filterFeatured')}
        </button>

        <div className="browse-bar__dropdown">
          <button
            type="button"
            className={`browse-bar__trigger${categoryParentKey ? ' has-value' : ''}`}
            aria-expanded={openMenu === 'category'}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => toggleMenu('category')}
          >
            <span className="browse-bar__trigger-label">{categoryParentName ?? t('browse.category')}</span>
            <Chevron open={openMenu === 'category'} />
          </button>
          {openMenu === 'category' && (
            <div className="browse-bar__panel" role="menu" aria-label={t('browse.category')}>
              {categoriesError && <p className="mkt-hint browse-bar__panel-hint">{t('browse.categoriesError')}</p>}
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!categoryParentKey}
                className={`browse-bar__option${!categoryParentKey ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange({ category: '' });
                  setOpenMenu(null);
                }}
              >
                {t('browse.allCategories')}
              </button>
              {roots.map((root) => {
                const selected = categoryParentKey === root.key;
                return (
                  <button
                    key={root.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`browse-bar__option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange({ category: root.key });
                      setOpenMenu(null);
                    }}
                  >
                    {root.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="browse-bar__dropdown">
          <button
            type="button"
            className={`browse-bar__trigger${subcategoryKey ? ' has-value' : ''}`}
            aria-expanded={openMenu === 'subcategory'}
            aria-haspopup="menu"
            disabled={subcategoryDisabled}
            onClick={() => {
              if (!subcategoryDisabled) toggleMenu('subcategory');
            }}
          >
            <span className="browse-bar__trigger-label">{subcategoryTriggerLabel}</span>
            <Chevron open={openMenu === 'subcategory'} />
          </button>
          {openMenu === 'subcategory' && !subcategoryDisabled && (
            <div className="browse-bar__panel" role="menu" aria-label={t('browse.subcategory')}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={!subcategoryKey}
                className={`browse-bar__option${!subcategoryKey ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange({ category: categoryParentKey });
                  setOpenMenu(null);
                }}
              >
                {t('browse.allSubcategories')}
              </button>
              {subcategories.map((child) => {
                const selected = subcategoryKey === child.key;
                return (
                  <button
                    key={child.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`browse-bar__option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange({ category: child.key });
                      setOpenMenu(null);
                    }}
                  >
                    {child.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="browse-bar__dropdown">
          <button
            type="button"
            className={`browse-bar__trigger${state.method ? ' has-value' : ''}`}
            aria-expanded={openMenu === 'type'}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => toggleMenu('type')}
          >
            <span className="browse-bar__trigger-label">{typeLabel}</span>
            <Chevron open={openMenu === 'type'} />
          </button>
          {openMenu === 'type' && (
            <div className="browse-bar__panel" role="menu">
              {LISTING_METHODS.map((method) => {
                const selected = state.method === method;
                return (
                  <button
                    key={method}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`browse-bar__option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange({ method: selected ? '' : method });
                      setOpenMenu(null);
                    }}
                  >
                    {methodLabel(lang, method)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="browse-bar__dropdown">
          <button
            type="button"
            className={`browse-bar__trigger${conditionFromDropdown ? ' has-value' : ''}`}
            aria-expanded={openMenu === 'condition'}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => toggleMenu('condition')}
          >
            <span className="browse-bar__trigger-label">{conditionTriggerLabel}</span>
            <Chevron open={openMenu === 'condition'} />
          </button>
          {openMenu === 'condition' && (
            <div className="browse-bar__panel" role="menu">
              {DROPDOWN_CONDITIONS.map((condition) => {
                const selected = state.condition === condition;
                return (
                  <button
                    key={condition}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`browse-bar__option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange({ condition: selected ? '' : condition });
                      setOpenMenu(null);
                    }}
                  >
                    {conditionLabel(lang, condition)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="browse-bar__dropdown browse-bar__dropdown--sort">
          <button
            type="button"
            className={`browse-bar__trigger${state.sort !== 'recent' ? ' has-value' : ''}`}
            aria-expanded={openMenu === 'sort'}
            aria-haspopup="menu"
            disabled={disabled}
            onClick={() => toggleMenu('sort')}
          >
            <span className="browse-bar__trigger-label">{sortLabels[state.sort]}</span>
            <Chevron open={openMenu === 'sort'} />
          </button>
          {openMenu === 'sort' && (
            <div className="browse-bar__panel" role="menu">
              {(['recent', 'title', 'featured'] as const).map((sort) => {
                const selected = state.sort === sort;
                return (
                  <button
                    key={sort}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`browse-bar__option${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      onChange({ sort });
                      setOpenMenu(null);
                    }}
                  >
                    {sortLabels[sort]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {barFiltersActive(state) && (
        <div className="browse-bar__clear-wrap">
          <button
            type="button"
            className="browse-bar__clear"
            disabled={disabled}
            onClick={() => onChange(clearBarFilterPatch())}
          >
            {t('browse.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}
