'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { qarToMinor } from '../../../lib/format';
import { fmtBusinessDateTime } from '../../../lib/format';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { pageWindow } from '../../../lib/admin';
import {
  CONDITION_LABEL,
  conditionOptionsFor,
  LANGUAGE_MODE_LABEL,
  AUDIENCE_LABEL,
  AUDIENCES,
  LANGUAGE_MODES,
  LISTING_METHODS,
  METHOD_LABEL,
  type Audience,
  requiredLocales,
  type AdminListing,
  type Condition,
  type LanguageMode,
  type ListingMethod,
  type ListingStatus,
} from '../../../lib/listings';
import {
  Badge,
  ErrorNote,
  GhostButton,
  Label,
  Modal,
  PageHeader,
  Panel,
  PrimaryButton,
  StateBlock,
  TableWrap,
} from '../ui';

type ListingPage = { listings: AdminListing[]; page: number; limit: number; total: number; totalPages: number };
type Category = { key: string; name: string; parentKey: string | null; depth: number; listingMethods: ListingMethod[] };
type SellerOption = { sellerReference: string; displayName: string; status: string };
type LocationOption = { key: string; label: string; cityKey: string; active?: boolean };

const STATUS_TONE: Record<ListingStatus, 'good' | 'neutral' | 'warn'> = {
  published: 'good',
  draft: 'neutral',
  archived: 'warn',
};

type ProductFormState = {
  sellerReference: string;
  categoryKey: string;
  audience: Audience | '';
  listingMethod: ListingMethod;
  languageMode: LanguageMode;
  condition: Condition | null;
  locationKey: string | null;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  featured: boolean;
  adminNotes: string;
  priceQar: string;
};

function defaultForm(categoryKey = '', sellerReference = ''): ProductFormState {
  return {
    sellerReference,
    categoryKey,
    audience: '',
    listingMethod: 'auction',
    languageMode: 'en',
    condition: 'used',
    locationKey: null,
    titleEn: '',
    titleAr: '',
    descEn: '',
    descAr: '',
    featured: false,
    adminNotes: '',
    priceQar: '',
  };
}

function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function basicsPayload(form: ProductFormState): Record<string, unknown> {
  return {
    sellerReference: form.sellerReference,
    categoryKey: form.categoryKey,
    audience: form.audience || null,
    listingMethod: form.listingMethod,
    languageMode: form.languageMode,
    condition: form.condition,
    locationKey: form.locationKey,
    title: { en: form.titleEn.trim() || null, ar: form.titleAr.trim() || null },
    description: { en: form.descEn.trim() || null, ar: form.descAr.trim() || null },
    attributes: {},
    media: [],
    coverAssetId: null,
    featured: form.featured,
    adminNotes: form.adminNotes.trim() ? form.adminNotes.trim() : null,
    ...(form.listingMethod === 'fixed_price' && form.priceQar.trim()
      ? { priceMinor: qarToMinor(Number(form.priceQar)) }
      : {}),
  };
}

function ProductFormFields({
  form,
  setForm,
  categories,
  sellers,
  locations,
  disabled,
}: {
  form: ProductFormState;
  setForm: (next: ProductFormState) => void;
  categories: Category[];
  sellers: SellerOption[];
  locations: LocationOption[];
  disabled?: boolean;
}) {
  const category = categories.find((entry) => entry.key === form.categoryKey);
  const methods = category?.listingMethods.length ? category.listingMethods : LISTING_METHODS;
  const conditions = conditionOptionsFor(form.listingMethod);
  const locales = requiredLocales(form.languageMode);

  return (
    <div className="adm-form adm-form--modal">
      <div className="adm-grid adm-grid--2">
        <div>
          <Label htmlFor="pf-seller">Seller</Label>
          <select
            id="pf-seller"
            className="field"
            disabled={disabled}
            value={form.sellerReference}
            onChange={(event) => setForm({ ...form, sellerReference: event.target.value })}
          >
            <option value="">Choose seller…</option>
            {sellers.filter((s) => s.status === 'active').map((seller) => (
              <option key={seller.sellerReference} value={seller.sellerReference}>
                {seller.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-audience">Audience</Label>
          <select
            id="pf-audience"
            className="field"
            disabled={disabled}
            value={form.audience}
            onChange={(event) => setForm({ ...form, audience: event.target.value as Audience | '' })}
          >
            <option value="">Choose Men or Women…</option>
            {AUDIENCES.map((entry) => (
              <option key={entry} value={entry}>
                {AUDIENCE_LABEL[entry]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-category">Category</Label>
          <select
            id="pf-category"
            className="field"
            disabled={disabled}
            value={form.categoryKey}
            onChange={(event) => {
              const categoryKey = event.target.value;
              const cat = categories.find((entry) => entry.key === categoryKey);
              const method = cat?.listingMethods.includes(form.listingMethod)
                ? form.listingMethod
                : (cat?.listingMethods[0] ?? form.listingMethod);
              const condition = conditionOptionsFor(method).includes(form.condition as Condition)
                ? form.condition
                : conditionOptionsFor(method)[0];
              setForm({ ...form, categoryKey, listingMethod: method, condition });
            }}
          >
            <option value="">Choose category…</option>
            {categories.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {'—'.repeat(entry.depth + 1)} {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-method">Listing method</Label>
          <select
            id="pf-method"
            className="field"
            disabled={disabled}
            value={form.listingMethod}
            onChange={(event) => {
              const listingMethod = event.target.value as ListingMethod;
              setForm({
                ...form,
                listingMethod,
                condition: conditionOptionsFor(listingMethod)[0],
              });
            }}
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABEL[method]}
              </option>
            ))}
          </select>
        </div>
        {form.listingMethod === 'fixed_price' ? (
          <div>
            <Label htmlFor="pf-price">Price (QAR)</Label>
            <input
              id="pf-price"
              className="field"
              type="number"
              min={1}
              step="0.01"
              disabled={disabled}
              value={form.priceQar}
              onChange={(event) => setForm({ ...form, priceQar: event.target.value })}
              placeholder="e.g. 450"
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="pf-language">Advertisement language</Label>
          <select
            id="pf-language"
            className="field"
            disabled={disabled}
            value={form.languageMode}
            onChange={(event) => setForm({ ...form, languageMode: event.target.value as LanguageMode })}
          >
            {LANGUAGE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {LANGUAGE_MODE_LABEL[mode]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-condition">Condition</Label>
          <select
            id="pf-condition"
            className="field"
            disabled={disabled}
            value={form.condition ?? ''}
            onChange={(event) => setForm({ ...form, condition: event.target.value as Condition })}
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {CONDITION_LABEL[condition]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pf-location">Location</Label>
          <select
            id="pf-location"
            className="field"
            disabled={disabled}
            value={form.locationKey ?? ''}
            onChange={(event) => setForm({ ...form, locationKey: event.target.value || null })}
          >
            <option value="">Not set</option>
            {locations.filter((loc) => loc.active !== false).map((loc) => (
              <option key={loc.key} value={loc.key}>
                {loc.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {locales.includes('en') && (
        <div>
          <Label htmlFor="pf-title-en">Title (English)</Label>
          <input
            id="pf-title-en"
            className="field"
            disabled={disabled}
            value={form.titleEn}
            onChange={(event) => setForm({ ...form, titleEn: event.target.value })}
          />
        </div>
      )}
      {locales.includes('ar') && (
        <div>
          <Label htmlFor="pf-title-ar">Title (Arabic)</Label>
          <input
            id="pf-title-ar"
            className="field"
            disabled={disabled}
            dir="rtl"
            value={form.titleAr}
            onChange={(event) => setForm({ ...form, titleAr: event.target.value })}
          />
        </div>
      )}
      <div>
        <Label htmlFor="pf-desc-en">Short description (English)</Label>
        <textarea
          id="pf-desc-en"
          className="field"
          rows={3}
          disabled={disabled}
          value={form.descEn}
          onChange={(event) => setForm({ ...form, descEn: event.target.value })}
        />
      </div>
      {form.languageMode !== 'en' && (
        <div>
          <Label htmlFor="pf-desc-ar">Short description (Arabic)</Label>
          <textarea
            id="pf-desc-ar"
            className="field"
            rows={3}
            disabled={disabled}
            dir="rtl"
            value={form.descAr}
            onChange={(event) => setForm({ ...form, descAr: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminListingsPage() {
  const session = useSession();
  const mayManage = session.capabilities.includes('inventory.manage');

  const [status, setStatus] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [sellerReference, setSellerReference] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ status: '', categoryKey: '', sellerReference: '', search: '' });

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<ProductFormState>(() => defaultForm());

  const [editRef, setEditRef] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [editLoading, setEditLoading] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<AdminListing | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const list = useAsync<ListingPage>(
    () =>
      apiFetch<ListingPage>(
        `/api/admin/listings?${new URLSearchParams({
          page: String(page),
          limit: '20',
          ...(query.status ? { status: query.status } : {}),
          ...(query.categoryKey ? { categoryKey: query.categoryKey } : {}),
          ...(query.sellerReference ? { sellerReference: query.sellerReference } : {}),
          ...(query.search ? { search: query.search } : {}),
        }).toString()}`,
        { cache: 'no-store' },
      ),
    [page, query],
  );

  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>('/api/admin/categories?includeInactive=true', { cache: 'no-store' }),
    [],
  );
  const sellers = useAsync<{ sellers: SellerOption[] }>(
    () => apiFetch<{ sellers: SellerOption[] }>('/api/admin/sellers?limit=100', { cache: 'no-store' }),
    [],
  );
  const locations = useAsync<{ locations: LocationOption[] }>(
    () => apiFetch<{ locations: LocationOption[] }>('/api/admin/locations', { cache: 'no-store' }),
    [],
  );

  const categoryList = categories.data?.categories ?? [];
  const sellerList = sellers.data?.sellers ?? [];

  const listings = useMemo(() => {
    const rows = list.data?.listings ?? [];
    if (!methodFilter) return rows;
    return rows.filter((row) => row.listingMethod === methodFilter);
  }, [list.data?.listings, methodFilter]);

  const loadEdit = useCallback(
    async (ref: string) => {
      setEditRef(ref);
      setEditLoading(true);
      setEditForm(null);
      setError(null);
      try {
        const response = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${ref}`, { cache: 'no-store' });
        const listing = response.listing;
        setEditVersion(listing.version);
        setEditForm({
          sellerReference: listing.seller.sellerReference,
          categoryKey: listing.category.key,
          audience: listing.audience ?? '',
          listingMethod: listing.listingMethod,
          languageMode: listing.languageMode,
          condition: listing.condition,
          locationKey: listing.locationKey,
          titleEn: listing.title.en ?? '',
          titleAr: listing.title.ar ?? '',
          descEn: listing.description.en ?? '',
          descAr: listing.description.ar ?? '',
          featured: listing.featured,
          adminNotes: listing.adminNotes ?? '',
          priceQar: listing.priceMinor ? String(listing.priceMinor / 100) : '',
        });
      } catch (err) {
        setError(apiMessage(err));
        setEditRef(null);
      } finally {
        setEditLoading(false);
      }
    },
    [],
  );

  async function publish(listing: AdminListing): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/listings/${listing.listingReference}/publish`, {
        method: 'POST',
        json: { expectedVersion: listing.version },
        headers: session.authHeaders(),
      });
      setNotice(`Published ${listing.listingReference}.`);
      list.reload();
    } catch (err) {
      setError(apiMessage(err));
      list.reload();
    } finally {
      setBusy(false);
    }
  }

  async function confirmArchive(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!archiveTarget) return;
    const reason = archiveReason.trim();
    if (reason.length < 3) {
      setError('Archiving needs a written reason (at least 3 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/listings/${archiveTarget.listingReference}/archive`, {
        method: 'POST',
        json: { reason },
        headers: session.authHeaders(),
      });
      setNotice(`Archived ${archiveTarget.listingReference}.`);
      setArchiveTarget(null);
      setArchiveReason('');
      list.reload();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!addForm.sellerReference || !addForm.categoryKey || !addForm.audience) {
      setError('Choose a seller, audience (Men or Women), and category.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await apiFetch<{ listing: AdminListing }>('/api/admin/listings', {
        method: 'POST',
        json: { sellerReference: addForm.sellerReference, categoryKey: addForm.categoryKey },
        headers: session.authHeaders(),
      });
      const ref = created.listing.listingReference;
      await apiFetch(`/api/admin/listings/${ref}`, {
        method: 'PATCH',
        json: { ...basicsPayload(addForm), expectedVersion: created.listing.version },
        headers: session.authHeaders(),
      });
      setNotice(`Product ${ref} created.`);
      setAddOpen(false);
      setAddForm(defaultForm());
      list.reload();
      void loadEdit(ref);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!editRef || !editForm) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${editRef}`, {
        method: 'PATCH',
        json: { ...basicsPayload(editForm), expectedVersion: editVersion },
        headers: session.authHeaders(),
      });
      setEditVersion(response.listing.version);
      setNotice(`Saved ${editRef}.`);
      setEditRef(null);
      setEditForm(null);
      list.reload();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pages = pageWindow(page, list.data?.totalPages ?? 1);

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title="Products"
        subtitle="Inventory records for auctions, fixed-price listings, and enquiries. A published product is not necessarily a live auction."
        actions={
          mayManage ? (
            <PrimaryButton type="button" onClick={() => { setAddOpen(true); setError(null); }}>
              Add product
            </PrimaryButton>
          ) : undefined
        }
      />

      <Panel
        title="Inventory"
        actions={
          <>
            <Badge tone="neutral">{list.data ? `${list.data.total} total` : '…'}</Badge>
            <GhostButton onClick={() => list.reload()} disabled={list.loading}>
              Reload
            </GhostButton>
          </>
        }
      >
        <ErrorNote>{error}</ErrorNote>
        {notice && (
          <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>
            {notice}
          </p>
        )}

        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ status, categoryKey, sellerReference, search });
            setPage(1);
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="l-search">Search</Label>
            <input
              id="l-search"
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, title or seller"
            />
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-status">Status</Label>
            <select id="l-status" className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-category">Category</Label>
            <select id="l-category" className="field" value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)}>
              <option value="">All categories</option>
              {categoryList.map((category) => (
                <option key={category.key} value={category.key}>
                  {'—'.repeat(category.depth + 1)} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-seller">Seller</Label>
            <select id="l-seller" className="field" value={sellerReference} onChange={(event) => setSellerReference(event.target.value)}>
              <option value="">All sellers</option>
              {sellerList.map((seller) => (
                <option key={seller.sellerReference} value={seller.sellerReference}>
                  {seller.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-method">Type</Label>
            <select id="l-method" className="field" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
              <option value="">All types</option>
              {LISTING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {METHOD_LABEL[method]}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-actions">
            <PrimaryButton>Apply filters</PrimaryButton>
            <GhostButton
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('');
                setCategoryKey('');
                setSellerReference('');
                setMethodFilter('');
                setQuery({ status: '', categoryKey: '', sellerReference: '', search: '' });
                setPage(1);
              }}
            >
              Clear
            </GhostButton>
          </div>
        </form>

        {methodFilter && (
          <p className="adm-hint" style={css('margin: -8px 0 12px')}>
            Type filter applies to the current page of results.
          </p>
        )}

        <StateBlock
          loading={list.loading}
          error={list.error}
          empty={listings.length === 0}
          emptyText="No products match these filters."
          onRetry={list.reload}
        >
          <TableWrap label="Products">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Status</th>
                  <th scope="col">Type</th>
                  <th scope="col">Audience</th>
                  <th scope="col">Live</th>
                  <th scope="col">Seller</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.listingReference}>
                    <td className="wrap">
                      <span style={css('font-weight: 600')}>
                        {listing.title.en ?? listing.title.ar ?? 'Untitled'}
                      </span>
                      <div className="adm-hint">Ad {listing.listingReference}</div>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[listing.status]}>{listing.status}</Badge>
                      {listing.moderation.state !== 'ok' && <Badge tone="bad">{listing.moderation.state}</Badge>}
                    </td>
                    <td>{METHOD_LABEL[listing.listingMethod]}</td>
                    <td>{listing.audience ? AUDIENCE_LABEL[listing.audience] : '—'}</td>
                    <td>
                      {listing.liveLotReference ? <Badge tone="good">Live auction</Badge> : '—'}
                    </td>
                    <td className="wrap">{listing.seller.displayName}</td>
                    <td>{fmtBusinessDateTime(listing.updatedAt)}</td>
                    <td>
                      <div className="adm-row-actions">
                        {mayManage && (
                          <button type="button" className="adm-link-btn" onClick={() => void loadEdit(listing.listingReference)}>
                            Edit
                          </button>
                        )}
                        {listing.listingMethod === 'auction' && listing.liveLotReference && (
                          <Link href={`/admin/auctions?listing=${encodeURIComponent(listing.listingReference)}`} style={css('font-weight: 600; font-size: 14px')}>
                            View bids
                          </Link>
                        )}
                        {mayManage && listing.status !== 'published' && listing.status !== 'archived' && (
                          <button type="button" className="adm-link-btn" disabled={busy} onClick={() => void publish(listing)}>
                            Publish
                          </button>
                        )}
                        {mayManage && listing.status !== 'archived' && (
                          <button
                            type="button"
                            className="adm-link-btn"
                            disabled={busy}
                            onClick={() => {
                              setArchiveTarget(listing);
                              setArchiveReason('');
                              setError(null);
                            }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <nav className="adm-pager" aria-label="Pagination">
            <span>
              Page {list.data?.page ?? 1} of {list.data?.totalPages ?? 1} · {list.data?.total ?? 0} products
            </span>
            <div className="adm-pages">
              <GhostButton disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                ← Previous
              </GhostButton>
              {pages.map((number) => (
                <button
                  key={number}
                  type="button"
                  aria-current={number === page ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <GhostButton disabled={page >= (list.data?.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>
                Next →
              </GhostButton>
            </div>
          </nav>
        </StateBlock>
      </Panel>

      <Modal
        open={addOpen}
        onClose={() => !busy && setAddOpen(false)}
        title="Add product"
        subtitle="Creates a draft product. Use Photos & attributes in the full editor for media and category fields."
        size="lg"
        footer={
          <>
            <GhostButton type="button" disabled={busy} onClick={() => setAddOpen(false)}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void submitAdd({ preventDefault: () => {} } as FormEvent)}>
              {busy ? 'Saving…' : 'Create product'}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={(event) => void submitAdd(event)}>
          <ProductFormFields
            form={addForm}
            setForm={setAddForm}
            categories={categoryList}
            sellers={sellerList}
            locations={locations.data?.locations ?? []}
            disabled={busy}
          />
        </form>
      </Modal>

      <Modal
        open={editRef !== null}
        onClose={() => !busy && !editLoading && (setEditRef(null), setEditForm(null))}
        title="Edit product"
        subtitle={editRef ? `Ad ${editRef}` : undefined}
        size="lg"
        footer={
          editRef ? (
            <>
              <Link href={`/admin/listings/${editRef}`} style={css('margin-right: auto; font-weight: 600; font-size: 14px')}>
                Photos &amp; attributes →
              </Link>
              <GhostButton type="button" disabled={busy || editLoading} onClick={() => { setEditRef(null); setEditForm(null); }}>
                Cancel
              </GhostButton>
              <PrimaryButton type="button" disabled={busy || editLoading || !editForm} onClick={() => void submitEdit({ preventDefault: () => {} } as FormEvent)}>
                {busy ? 'Saving…' : 'Save'}
              </PrimaryButton>
            </>
          ) : undefined
        }
      >
        {editLoading || !editForm ? (
          <p role="status" className="adm-state" data-state="loading">Loading product…</p>
        ) : (
          <form onSubmit={(event) => void submitEdit(event)}>
            <ProductFormFields
              form={editForm}
              setForm={setEditForm}
              categories={categoryList}
              sellers={sellerList}
              locations={locations.data?.locations ?? []}
              disabled={busy}
            />
            <div className="adm-grid" style={css('margin-top: 14px')}>
              <div>
                <Label htmlFor="pf-featured">Featured on homepage</Label>
                <select
                  id="pf-featured"
                  className="field"
                  value={editForm.featured ? 'yes' : 'no'}
                  onChange={(event) => setEditForm({ ...editForm, featured: event.target.value === 'yes' })}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pf-notes">Admin notes</Label>
                <textarea
                  id="pf-notes"
                  className="field"
                  rows={2}
                  value={editForm.adminNotes}
                  onChange={(event) => setEditForm({ ...editForm, adminNotes: event.target.value })}
                />
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={archiveTarget !== null}
        onClose={() => !busy && setArchiveTarget(null)}
        title="Archive product"
        subtitle={archiveTarget ? `Ad ${archiveTarget.listingReference}` : undefined}
        size="sm"
        footer={
          <>
            <GhostButton type="button" disabled={busy} onClick={() => setArchiveTarget(null)}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void confirmArchive({ preventDefault: () => {} } as FormEvent)}>
              Confirm archive
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={(event) => void confirmArchive(event)}>
          <Label htmlFor="archive-reason">Reason</Label>
          <textarea
            id="archive-reason"
            className="field"
            rows={3}
            value={archiveReason}
            onChange={(event) => setArchiveReason(event.target.value)}
            placeholder="Why is this product archived?"
          />
        </form>
      </Modal>
    </div>
  );
}
