'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { fmtBusinessDateTime } from '../../../lib/format';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { pageWindow } from '../../../lib/admin';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { methodLabel } from '../../../lib/uiMessages';
import {
  LISTING_METHODS,
  type AdminListing,
  type ListingMethod,
  type ListingStatus,
  localizedText,
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
  const { t, lang } = useUiLocale();
  const session = useSession();

  const audienceChrome = (audience: string | null | undefined) => {
    if (!audience) return '—';
    if (audience === 'men') return t('common.men');
    if (audience === 'women') return t('common.women');
    if (audience === 'unisex') return t('common.unisex');
    if (audience === 'all') return t('common.all');
    return audience;
  };
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
  const [duplicateTarget, setDuplicateTarget] = useState<AdminListing | null>(null);

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

  async function confirmDuplicate(): Promise<void> {
    if (!duplicateTarget) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ listing: AdminListing }>(
        `/api/admin/listings/${duplicateTarget.listingReference}/duplicate`,
        { method: 'POST', json: {}, headers: session.authHeaders() },
      );
      setDuplicateTarget(null);
      setNotice(`Duplicated as new draft ${response.listing.listingReference}. The original is unchanged.`);
      setEditorMode('edit');
      setEditorRef(response.listing.listingReference);
      setEditorOpen(true);
      list.reload();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!deleteTarget) return;
    const reason = deleteReason.trim();
    if (reason.length < 3) {
      setError(t('admin.products.deleteReasonRequired'));
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
        title={t('admin.products.title')}
        subtitle={t('admin.products.subtitle')}
        actions={
          mayManage ? (
            <PrimaryButton type="button" onClick={openAdd}>
              {t('admin.products.add')}
            </PrimaryButton>
          ) : undefined
        }
      />

      <Panel
        title={t('admin.products.inventory')}
        actions={
          <>
            <Badge tone="neutral">{list.data ? t('admin.common.total', { count: list.data.total }) : '…'}</Badge>
            <GhostButton onClick={() => list.reload()} disabled={list.loading}>
              {t('admin.common.reload')}
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
            <Label htmlFor="l-search">{t('admin.field.search')}</Label>
            <input
              id="l-search"
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('admin.products.searchPlaceholder')}
            />
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-status">{t('admin.field.status')}</Label>
            <select id="l-status" className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t('admin.common.allStatuses')}</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-category">{t('admin.field.category')}</Label>
            <select id="l-category" className="field" value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)}>
              <option value="">{t('admin.common.allCategories')}</option>
              {categoryList.map((category) => (
                <option key={category.key} value={category.key}>
                  {'—'.repeat(category.depth + 1)} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="l-method">{t('admin.field.type')}</Label>
            <select id="l-method" className="field" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
              <option value="">{t('admin.common.allTypes')}</option>
              {LISTING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {methodLabel(lang, method)}
                </option>
              ))}
            </select>
          </div>
          <div className="adm-actions">
            <PrimaryButton>{t('admin.common.applyFilters')}</PrimaryButton>
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
              {t('admin.common.clear')}
            </GhostButton>
          </div>
        </form>

        {methodFilter && (
          <p className="adm-hint" style={css('margin: -8px 0 12px')}>
            {t('admin.products.typeFilterHint')}
          </p>
        )}

        <StateBlock
          loading={list.loading}
          error={list.error}
          empty={listings.length === 0}
          emptyText={t('admin.products.empty')}
          onRetry={list.reload}
        >
          <TableWrap label={t('admin.products.tableCaption')}>
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">{t('admin.products.colProduct')}</th>
                  <th scope="col">{t('admin.products.colStatus')}</th>
                  <th scope="col">{t('admin.products.colType')}</th>
                  <th scope="col">{t('admin.products.colAudience')}</th>
                  <th scope="col">{t('admin.products.colLive')}</th>
                  <th scope="col">{t('admin.products.colUpdated')}</th>
                  <th scope="col">{t('admin.products.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.listingReference}>
                    <td className="wrap">
                      <span style={css('font-weight: 600')}>
                        {localizedText(listing.title, lang, t('admin.products.untitled'))}
                      </span>
                      <div className="adm-hint">{t('admin.common.adRef', { ref: listing.listingReference })}</div>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[listing.status]}>{listing.status}</Badge>
                      {listing.moderation.state !== 'ok' && <Badge tone="bad">{listing.moderation.state}</Badge>}
                    </td>
                    <td>{methodLabel(lang, listing.listingMethod)}</td>
                    <td>{audienceChrome(listing.audience)}</td>
                    <td>
                      {listing.liveLotReference ? <Badge tone="good">{t('admin.products.liveAuction')}</Badge> : '—'}
                    </td>
                    <td>{fmtBusinessDateTime(listing.updatedAt)}</td>
                    <td>
                      <div className="adm-row-actions">
                        {mayManage && (
                          <button type="button" className="adm-link-btn" onClick={() => openEdit(listing.listingReference)}>
                            {t('admin.common.edit')}
                          </button>
                        )}
                        {listing.listingMethod === 'auction' && listing.liveLotReference && (
                          <Link href={`/admin/auctions?listing=${encodeURIComponent(listing.listingReference)}`} style={css('font-weight: 600; font-size: 14px')}>
                            {t('admin.products.viewBids')}
                          </Link>
                        )}
                        {mayManage && listing.status !== 'published' && listing.status !== 'archived' && (
                          <button type="button" className="adm-link-btn" disabled={busy} onClick={() => void publish(listing)}>
                            {t('admin.common.publish')}
                          </button>
                        )}
                        {mayManage && listing.moderation.state !== 'blocked' && (
                          <button
                            type="button"
                            className="adm-link-btn"
                            disabled={busy}
                            onClick={() => {
                              setDuplicateTarget(listing);
                              setError(null);
                            }}
                          >
                            {t('admin.products.duplicateUnsold')}
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
                            {t('admin.products.deleteProduct')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <nav className="adm-pager" aria-label={t('admin.common.pagination')}>
            <span>
              {t('admin.products.pageOf', { page: list.data?.page ?? 1, totalPages: list.data?.totalPages ?? 1, total: list.data?.total ?? 0 })}
            </span>
            <div className="adm-pages">
              <GhostButton disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                {t('admin.common.previous')}
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
                {t('admin.common.next')}
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
          setNotice(
            t('admin.products.saved', {
              name: localizedText(listing.title, lang, listing.listingReference),
            }),
          );
          list.reload();
        }}
        onDeleted={(listingRef) => {
          setEditorOpen(false);
          setNotice(t('admin.products.deleted', { ref: listingRef }));
          list.reload();
        }}
        onDuplicated={(listing) => {
          setNotice(t('admin.products.duplicated', { ref: listing.listingReference }));
          setEditorMode('edit');
          setEditorRef(listing.listingReference);
          setEditorOpen(true);
          list.reload();
        }}
      />

      <Modal
        open={duplicateTarget !== null}
        onClose={() => !busy && setDuplicateTarget(null)}
        title={t('admin.products.duplicateTitle')}
        subtitle={duplicateTarget ? t('admin.common.adRef', { ref: duplicateTarget.listingReference }) : undefined}
        size="sm"
        footer={
          <>
            <GhostButton type="button" disabled={busy} onClick={() => setDuplicateTarget(null)}>{t('admin.common.cancel')}</GhostButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void confirmDuplicate()}>
              {t('admin.common.duplicate')}
            </PrimaryButton>
          </>
        }
      >
        <p style={css('margin: 0; line-height: 1.5')}>
          {t('admin.products.duplicateBody')}
        </p>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => !busy && setDeleteTarget(null)}
        title={t('admin.products.deleteTitle')}
        subtitle={deleteTarget ? t('admin.common.adRef', { ref: deleteTarget.listingReference }) : undefined}
        size="sm"
        footer={
          <>
            <GhostButton type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>{t('admin.common.cancel')}</GhostButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void confirmDelete({ preventDefault: () => {} } as FormEvent)}>
              {t('admin.common.delete')}
            </PrimaryButton>
          </>
        }
      >
        <form onSubmit={(event) => void confirmDelete(event)}>
          <Label htmlFor="delete-reason">{t('admin.products.deleteReason')}</Label>
          <textarea
            id="delete-reason"
            className="field"
            rows={3}
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder={t('admin.products.deletePlaceholder')}
          />
        </form>
      </Modal>
    </div>
  );
}
