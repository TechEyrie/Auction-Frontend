'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { fmtBusinessDateTime } from '../../../lib/format';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { pageWindow } from '../../../lib/admin';
import {
  AUDIENCE_LABEL,
  LISTING_METHODS,
  METHOD_LABEL,
  type AdminListing,
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
import ProductEditorModal from './ProductEditorModal';

type ListingPage = { listings: AdminListing[]; page: number; limit: number; total: number; totalPages: number };
type Category = { key: string; name: string; parentKey: string | null; depth: number; listingMethods: ListingMethod[] };
type SellerOption = { sellerReference: string; displayName: string; status: string };
type LocationOption = {
  key: string;
  cityKey: string;
  active?: boolean;
  label?: string;
  labels?: { en?: string; ar?: string | null };
};

const STATUS_TONE: Record<ListingStatus, 'good' | 'neutral' | 'warn'> = {
  published: 'good',
  draft: 'neutral',
  archived: 'warn',
};

function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
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

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editorRef, setEditorRef] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminListing | null>(null);
  const [deleteReason, setDeleteReason] = useState('Removed by operator');

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

  function openAdd(): void {
    setEditorMode('add');
    setEditorRef(null);
    setEditorOpen(true);
    setError(null);
  }

  function openEdit(ref: string): void {
    setEditorMode('edit');
    setEditorRef(ref);
    setEditorOpen(true);
    setError(null);
  }

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

  async function confirmDelete(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!deleteTarget) return;
    const reason = deleteReason.trim();
    if (reason.length < 3) {
      setError('Delete needs a written reason (at least 3 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/listings/${deleteTarget.listingReference}/archive`, {
        method: 'POST',
        json: { reason },
        headers: session.authHeaders(),
      });
      setNotice(`Deleted ${deleteTarget.listingReference}.`);
      setDeleteTarget(null);
      setDeleteReason('Removed by operator');
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
        subtitle="Create and edit full products in one place — basics, copy, category details, photos, and publish."
        actions={
          mayManage ? (
            <PrimaryButton type="button" onClick={openAdd}>
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
              placeholder="Reference or title"
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
                  <th scope="col">Updated (Qatar)</th>
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
                    <td>{fmtBusinessDateTime(listing.updatedAt)}</td>
                    <td>
                      <div className="adm-row-actions">
                        {mayManage && (
                          <button type="button" className="adm-link-btn" onClick={() => openEdit(listing.listingReference)}>
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
                            className="adm-row-btn adm-row-btn--danger"
                            disabled={busy}
                            onClick={() => {
                              setDeleteTarget(listing);
                              setDeleteReason('Removed by operator');
                              setError(null);
                            }}
                          >
                            Delete product
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

      <ProductEditorModal
        open={editorOpen}
        mode={editorMode}
        listingReference={editorRef}
        categories={categoryList}
        locations={locations.data?.locations ?? []}
        sellers={sellerList}
        session={session}
        mayManage={mayManage}
        onClose={() => setEditorOpen(false)}
        onSaved={(listing) => {
          setEditorMode('edit');
          setEditorRef(listing.listingReference);
          setNotice(`Saved ${listing.title.en ?? listing.title.ar ?? listing.listingReference}.`);
          list.reload();
        }}
        onDeleted={(listingRef) => {
          setEditorOpen(false);
          setNotice(`Deleted ${listingRef}.`);
          list.reload();
        }}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => !busy && setDeleteTarget(null)}
        title="Delete product"
        subtitle={deleteTarget ? `Ad ${deleteTarget.listingReference}` : undefined}
        size="sm"
        footer={
          <>
            <GhostButton type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</GhostButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void confirmDelete({ preventDefault: () => {} } as FormEvent)}>
              Delete
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={(event) => void confirmDelete(event)}>
          <Label htmlFor="delete-reason">Reason</Label>
          <textarea
            id="delete-reason"
            className="field"
            rows={3}
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Why is this product being removed?"
          />
        </form>
      </Modal>
    </div>
  );
}
