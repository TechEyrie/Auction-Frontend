'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { pageWindow } from '../../../lib/admin';
import { fmtBusinessDateTime, fmtMinor, qarToMinor } from '../../../lib/format';
import { css } from '../../../lib/css';
import {
  AUDIENCE_LABEL,
  type AdminListing,
  type ListingStatus,
} from '../../../lib/listings';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import {
  Badge,
  ErrorNote,
  GhostButton,
  Hint,
  Label,
  Modal,
  PageHeader,
  Panel,
  PrimaryButton,
  StateBlock,
  TableWrap,
} from '../ui';

function roundToMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultOpenSchedule(): { startsAtLocal: string; endsAtLocal: string } {
  const starts = roundToMinute(new Date());
  const ends = roundToMinute(new Date(starts.getTime() + 4 * 3_600_000));
  return { startsAtLocal: toDatetimeLocalValue(starts), endsAtLocal: toDatetimeLocalValue(ends) };
}

type ListingPage = { listings: AdminListing[]; page: number; limit: number; total: number; totalPages: number };

type AdminAuction = {
  lotReference: string;
  listingReference: string;
  status: string;
  outcome: 'pending' | 'sold' | 'no_bids';
  bidCount: number;
  startingBidMinor: number;
  incrementMinor: number;
  currentAmountMinor: number | null;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  winningUserReference: string | null;
  orderReference: string | null;
  version: number;
};

type AuctionListPage = {
  auctions: AdminAuction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AdminBidRow = {
  sequence: number;
  userReference: string;
  bidderLabel: string;
  fullName: string | null;
  amountMinor: number;
  acceptedAt: string;
};

const STATUS_TONE: Record<ListingStatus, 'good' | 'neutral' | 'warn'> = {
  published: 'good',
  draft: 'neutral',
  archived: 'warn',
};

const AUCTION_STATUS_TONE: Record<string, 'good' | 'neutral' | 'warn' | 'bad'> = {
  live: 'good',
  scheduled: 'neutral',
  draft: 'neutral',
  closed: 'warn',
  cancelled: 'bad',
};

function outcomeLabel(auction: AdminAuction): string {
  if (auction.status === 'live') return 'Live';
  if (auction.status === 'scheduled') return 'Scheduled';
  if (auction.status === 'draft') return 'Draft';
  if (auction.status === 'cancelled') return 'Cancelled';
  if (auction.outcome === 'sold') return 'Sold';
  if (auction.outcome === 'no_bids') return 'Not sold (no bids)';
  return 'Pending';
}

function outcomeTone(auction: AdminAuction): 'good' | 'neutral' | 'warn' | 'bad' {
  if (auction.status === 'live') return 'good';
  if (auction.outcome === 'sold') return 'good';
  if (auction.outcome === 'no_bids') return 'warn';
  return 'neutral';
}

const BIDS_PAGE_SIZE = 100;

function AdminAuctionsContent() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mayManage = session.capabilities.includes('auctions.manage');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ search: '' });
  const [selectedRef, setSelectedRef] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [openTarget, setOpenTarget] = useState<AdminListing | null>(null);
  const [startingBidQar, setStartingBidQar] = useState('100');
  const [incrementQar, setIncrementQar] = useState('10');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [openBusy, setOpenBusy] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [bidsModalLot, setBidsModalLot] = useState<string | null>(null);
  const [bids, setBids] = useState<AdminBidRow[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsMessage, setBidsMessage] = useState<string | null>(null);
  const [bidsHasMore, setBidsHasMore] = useState(false);

  const listings = useAsync<ListingPage>(
    () =>
      apiFetch<ListingPage>(
        `/api/admin/listings?${new URLSearchParams({
          page: String(page),
          limit: '20',
          status: 'published',
          ...(query.search ? { search: query.search } : {}),
        }).toString()}`,
        { headers: session.authHeaders(), cache: 'no-store' },
      ),
    [page, query, session],
  );

  const auctionProducts = useMemo(
    () => (listings.data?.listings ?? []).filter((row) => row.listingMethod === 'auction'),
    [listings.data?.listings],
  );

  type ProductAuctionStats = { runs: number; unsold: number; sold: number };
  const [productStats, setProductStats] = useState<Record<string, ProductAuctionStats>>({});

  useEffect(() => {
    if (auctionProducts.length === 0) {
      setProductStats({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        auctionProducts.map(async (listing) => {
          try {
            const page = await apiFetch<AuctionListPage>(
              `/api/admin/auctions?${new URLSearchParams({
                listingReference: listing.listingReference,
                limit: '50',
                page: '1',
              }).toString()}`,
              { headers: session.authHeaders(), cache: 'no-store' },
            );
            const auctions = page.auctions ?? [];
            const unsold = auctions.filter((row) => row.status === 'closed' && row.outcome === 'no_bids').length;
            const sold = auctions.filter((row) => row.outcome === 'sold').length;
            return [listing.listingReference, { runs: page.total ?? auctions.length, unsold, sold }] as const;
          } catch {
            return [listing.listingReference, { runs: 0, unsold: 0, sold: 0 }] as const;
          }
        }),
      );
      if (!cancelled) {
        setProductStats(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionProducts, session]);

  const history = useAsync<AuctionListPage>(
    () => {
      if (!selectedRef) return Promise.resolve({ auctions: [], page: 1, limit: 50, total: 0, totalPages: 0 });
      return apiFetch<AuctionListPage>(
        `/api/admin/auctions?${new URLSearchParams({
          listingReference: selectedRef,
          limit: '50',
          page: '1',
        }).toString()}`,
        { headers: session.authHeaders(), cache: 'no-store' },
      );
    },
    [selectedRef, session],
  );

  const selectedListing = useMemo(
    () => auctionProducts.find((row) => row.listingReference === selectedRef) ?? null,
    [auctionProducts, selectedRef],
  );

  const selectProduct = useCallback(
    (ref: string) => {
      setSelectedRef(ref);
      setNotice(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set('listing', ref);
      router.replace(`/admin/auctions?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const closeHistoryModal = useCallback(() => {
    setSelectedRef(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('listing');
    const qs = params.toString();
    router.replace(qs ? `/admin/auctions?${qs}` : '/admin/auctions', { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const listing = searchParams.get('listing');
    if (listing && listing !== selectedRef) {
      setSelectedRef(listing);
    }
  }, [searchParams, selectedRef]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setQuery({ search: search.trim() });
    setPage(1);
  };

  const beginOpenAuction = (listing: AdminListing) => {
    const schedule = defaultOpenSchedule();
    setOpenTarget(listing);
    setStartingBidQar('100');
    setIncrementQar('10');
    setStartsAtLocal(schedule.startsAtLocal);
    setEndsAtLocal(schedule.endsAtLocal);
    setOpenError(null);
    setOpenModal(true);
  };

  const submitOpenAuction = async (event: FormEvent) => {
    event.preventDefault();
    if (!openTarget) return;
    setOpenError(null);

    const startingQar = Number(startingBidQar);
    const incrementQarNum = Number(incrementQar);
    if (!Number.isFinite(startingQar) || startingQar < 0) {
      setOpenError('Enter a valid starting bid in QAR');
      return;
    }
    if (!Number.isFinite(incrementQarNum) || incrementQarNum <= 0) {
      setOpenError('Enter a valid increment in QAR (greater than zero)');
      return;
    }
    const startsAt = new Date(startsAtLocal);
    const endsAt = new Date(endsAtLocal);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setOpenError('Enter valid start and end times');
      return;
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      setOpenError('End time must be after start time');
      return;
    }

    setOpenBusy(true);
    try {
      const created = await apiFetch<{ auction: { lotReference: string } }>('/api/admin/auctions', {
        method: 'POST',
        headers: session.authHeaders(),
        json: {
          listingReference: openTarget.listingReference,
          startingBidMinor: qarToMinor(startingQar),
          incrementMinor: qarToMinor(incrementQarNum),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      });
      await apiFetch(`/api/admin/auctions/${created.auction.lotReference}/open`, {
        method: 'POST',
        headers: session.authHeaders(),
      });
      setOpenModal(false);
      setNotice(`Auction opened for ${openTarget.title.en ?? openTarget.listingReference}.`);
      selectProduct(openTarget.listingReference);
      history.reload();
      listings.reload({ soft: true });
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open the auction');
    } finally {
      setOpenBusy(false);
    }
  };

  const fetchBids = useCallback(
    async (lotReference: string, before?: number, append = false) => {
      setBidsLoading(true);
      setBidsMessage(null);
      try {
        const params = new URLSearchParams({ limit: String(BIDS_PAGE_SIZE) });
        if (before !== undefined) params.set('before', String(before));
        const result = await apiFetch<{ bids: AdminBidRow[] }>(
          `/api/admin/auctions/${encodeURIComponent(lotReference)}/bids?${params}`,
          { headers: session.authHeaders() },
        );
        const rows = result.bids;
        setBids((prev) => (append ? [...prev, ...rows] : rows));
        setBidsHasMore(rows.length >= BIDS_PAGE_SIZE);
        if (!append && rows.length === 0) setBidsMessage('No bids on this auction yet.');
      } catch (err) {
        setBidsMessage(err instanceof Error ? err.message : 'Could not load bids');
        if (!append) setBids([]);
        setBidsHasMore(false);
      } finally {
        setBidsLoading(false);
      }
    },
    [session],
  );

  const openBidsModal = (lotReference: string) => {
    setBidsModalLot(lotReference);
    setBids([]);
    void fetchBids(lotReference);
  };

  const loadMoreBids = async () => {
    if (!bidsModalLot || bids.length === 0) return;
    const oldest = bids.reduce((min, row) => (row.sequence < min ? row.sequence : min), bids[0].sequence);
    await fetchBids(bidsModalLot, oldest, true);
  };

  const totalPages = listings.data?.totalPages ?? 0;
  const auctionCount = history.data?.total ?? 0;

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title="Auctions"
        subtitle="Search auction products, review past runs, and open new timed auctions."
      />

      {notice && (
        <p className="adm-note" data-tone="good">
          {notice}
        </p>
      )}

      <Panel title="Auction products" subtitle="Published catalogue items set to the auction listing method.">
        <form className="adm-filters" onSubmit={applyFilters}>
          <div className="adm-filter" style={css('flex: 2 1 280px')}>
            <Label htmlFor="auc-search">Search</Label>
            <input
              id="auc-search"
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title or Ad reference…"
            />
          </div>
          <div className="adm-actions">
            <PrimaryButton>Search</PrimaryButton>
            <GhostButton
              type="button"
              onClick={() => {
                setSearch('');
                setQuery({ search: '' });
                setPage(1);
              }}
            >
              Clear
            </GhostButton>
          </div>
        </form>

        <StateBlock
          loading={listings.loading}
          error={listings.error}
          empty={auctionProducts.length === 0}
          emptyText="No published auction products match this search."
          onRetry={listings.reload}
        >
          <TableWrap label="Auction products">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Status</th>
                  <th scope="col">Audience</th>
                  <th scope="col">Live</th>
                  <th scope="col">Runs</th>
                  <th scope="col">Unsold</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auctionProducts.map((listing) => {
                  const selected = listing.listingReference === selectedRef;
                  const stats = productStats[listing.listingReference];
                  return (
                    <tr
                      key={listing.listingReference}
                      data-selected={selected ? 'true' : undefined}
                      style={selected ? css('background: var(--adm-row-selected, rgba(0,0,0,0.04))') : undefined}
                    >
                      <td className="wrap">
                        <button
                          type="button"
                          className="adm-link-btn"
                          style={css('font-weight: 600; text-align: left')}
                          onClick={() => selectProduct(listing.listingReference)}
                        >
                          {listing.title.en ?? listing.title.ar ?? 'Untitled'}
                        </button>
                        <div className="adm-hint">Ad {listing.listingReference}</div>
                      </td>
                      <td>
                        <Badge tone={STATUS_TONE[listing.status]}>{listing.status}</Badge>
                      </td>
                      <td>{listing.audience ? AUDIENCE_LABEL[listing.audience] : '—'}</td>
                      <td>
                        {listing.liveLotReference ? <Badge tone="good">Live</Badge> : '—'}
                      </td>
                      <td>{stats ? stats.runs : '…'}</td>
                      <td>
                        {stats ? (
                          stats.unsold > 0 ? <Badge tone="warn">{stats.unsold}</Badge> : stats.unsold
                        ) : '…'}
                      </td>
                      <td>
                        <div className="adm-row-actions">
                          <button type="button" className="adm-link-btn" onClick={() => selectProduct(listing.listingReference)}>
                            History
                          </button>
                          {mayManage && (
                            <button type="button" className="adm-link-btn" onClick={() => beginOpenAuction(listing)}>
                              Open auction
                            </button>
                          )}
                          <Link href={`/admin/listings/${listing.listingReference}`} className="adm-link-btn">
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>

          {totalPages > 1 && (
            <nav className="adm-pager" aria-label="Products pages" style={css('margin-top: 14px')}>
              <GhostButton type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </GhostButton>
              {pageWindow(page, totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === page ? 'adm-pager-btn adm-pager-btn--active' : 'adm-pager-btn'}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <GhostButton type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </GhostButton>
            </nav>
          )}
        </StateBlock>
      </Panel>

      <Modal
        open={selectedRef !== null}
        onClose={closeHistoryModal}
        title="Auction history"
        size="lg"
        subtitle={
          selectedRef
            ? selectedListing
              ? `${selectedListing.title.en ?? selectedListing.title.ar ?? selectedRef} · Ad ${selectedRef} · ${auctionCount} auction${auctionCount === 1 ? '' : 's'}`
              : `Ad ${selectedRef} · ${auctionCount} auction${auctionCount === 1 ? '' : 's'}`
            : undefined
        }
        footer={
          <div className="adm-actions">
            <GhostButton type="button" onClick={closeHistoryModal}>
              Close
            </GhostButton>
            {mayManage && selectedListing ? (
              <PrimaryButton type="button" onClick={() => beginOpenAuction(selectedListing)}>
                Open auction
              </PrimaryButton>
            ) : null}
          </div>
        }
      >
        <StateBlock
          loading={history.loading}
          error={history.error}
          empty={!history.loading && (history.data?.auctions.length ?? 0) === 0}
          emptyText="No auctions have been run for this product yet."
          onRetry={history.reload}
        >
          <TableWrap label="Auction history for product">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Status</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Bids</th>
                  <th scope="col">Schedule</th>
                  <th scope="col">Top bid</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.auctions ?? []).map((auction, index) => (
                  <tr key={auction.lotReference}>
                    <td>
                      <div>{(history.data?.auctions.length ?? 0) - index}</div>
                      <div className="adm-hint">{auction.lotReference}</div>
                    </td>
                    <td>
                      <Badge tone={AUCTION_STATUS_TONE[auction.status] ?? 'neutral'}>{auction.status}</Badge>
                    </td>
                    <td>
                      <Badge tone={outcomeTone(auction)}>{outcomeLabel(auction)}</Badge>
                    </td>
                    <td>{auction.bidCount}</td>
                    <td className="wrap">
                      <div>{fmtBusinessDateTime(auction.startsAt)}</div>
                      <div className="adm-hint">→ {fmtBusinessDateTime(auction.endsAt)}</div>
                      {auction.closedAt ? <div className="adm-hint">Closed {fmtBusinessDateTime(auction.closedAt)}</div> : null}
                    </td>
                    <td>
                      {auction.currentAmountMinor != null ? fmtMinor(auction.currentAmountMinor) : fmtMinor(auction.startingBidMinor)}
                      <div className="adm-hint">Start {fmtMinor(auction.startingBidMinor)}</div>
                    </td>
                    <td>
                      <div className="adm-row-actions">
                        <button type="button" className="adm-link-btn" onClick={() => openBidsModal(auction.lotReference)}>
                          View bids
                        </button>
                        {auction.orderReference ? (
                          <span className="adm-hint">{auction.orderReference}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Modal>

      <Modal
        open={openModal}
        onClose={() => !openBusy && setOpenModal(false)}
        title="Open auction"
        subtitle={
          openTarget
            ? `${openTarget.title.en ?? openTarget.title.ar ?? 'Product'} · Ad ${openTarget.listingReference}`
            : undefined
        }
        footer={
          <div className="adm-actions">
            <GhostButton type="button" disabled={openBusy} onClick={() => setOpenModal(false)}>
              Cancel
            </GhostButton>
            <PrimaryButton
              type="button"
              disabled={openBusy}
              onClick={() => void submitOpenAuction({ preventDefault: () => {} } as FormEvent)}
            >
              {openBusy ? 'Working…' : 'Create and open'}
            </PrimaryButton>
          </div>
        }
      >
        <ErrorNote>{openError}</ErrorNote>
        <form className="adm-form" onSubmit={(event) => void submitOpenAuction(event)}>
          <div className="adm-grid">
            <div>
              <Label htmlFor="open-start">Starting bid (QAR)</Label>
              <input
                id="open-start"
                className="field"
                value={startingBidQar}
                onChange={(event) => setStartingBidQar(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <Label htmlFor="open-inc">Bid increment (QAR)</Label>
              <input
                id="open-inc"
                className="field"
                value={incrementQar}
                onChange={(event) => setIncrementQar(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <Label htmlFor="open-starts">Starts at</Label>
              <input
                id="open-starts"
                className="field"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(event) => setStartsAtLocal(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="open-ends">Ends at</Label>
              <input
                id="open-ends"
                className="field"
                type="datetime-local"
                value={endsAtLocal}
                onChange={(event) => setEndsAtLocal(event.target.value)}
                required
              />
            </div>
          </div>
          <Hint>Defaults: start now, end in 4 hours. Amounts are in QAR; times use your browser timezone.</Hint>
        </form>
      </Modal>

      <Modal
        open={bidsModalLot !== null}
        onClose={() => setBidsModalLot(null)}
        title="Bid history"
        subtitle={bidsModalLot ? `Auction id ${bidsModalLot}` : undefined}
        size="lg"
      >
        <StateBlock
          loading={bidsLoading && bids.length === 0}
          error={null}
          empty={!bidsLoading && bids.length === 0}
          emptyText={bidsMessage ?? 'No bids loaded.'}
        >
          {bids.length > 0 && (
            <>
              <TableWrap label="Accepted bids">
                <table className="adm-table adm-table--sticky-head">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Bidder</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((row) => (
                      <tr key={row.sequence}>
                        <td>{row.sequence}</td>
                        <td className="wrap">
                          <div style={css('font-weight: 600')}>{row.bidderLabel}</div>
                          <div className="adm-hint">{row.userReference}</div>
                          {row.fullName ? <div className="adm-hint">{row.fullName}</div> : null}
                        </td>
                        <td>{fmtMinor(row.amountMinor)}</td>
                        <td>{fmtBusinessDateTime(row.acceptedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              {bidsHasMore && (
                <div className="adm-actions" style={css('margin-top: 14px')}>
                  <GhostButton type="button" onClick={() => void loadMoreBids()} disabled={bidsLoading}>
                    {bidsLoading ? 'Loading…' : 'Load more'}
                  </GhostButton>
                </div>
              )}
            </>
          )}
        </StateBlock>
      </Modal>
    </div>
  );
}

export default function AdminAuctionsPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="adm-state" data-state="loading">
          Loading auctions…
        </p>
      }
    >
      <AdminAuctionsContent />
    </Suspense>
  );
}
