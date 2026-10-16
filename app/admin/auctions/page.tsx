'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { productPath } from '../../../lib/listings';
import { fmtBusinessDateTime, fmtMinor, qarToMinor } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { css } from '../../../lib/css';
import {
  ErrorNote,
  GhostButton,
  Hint,
  Label,
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

function defaultSchedule(): { startsAtLocal: string; endsAtLocal: string } {
  const starts = roundToMinute(new Date());
  const ends = roundToMinute(new Date(starts.getTime() + 24 * 3_600_000));
  return { startsAtLocal: toDatetimeLocalValue(starts), endsAtLocal: toDatetimeLocalValue(ends) };
}

const INITIAL_SCHEDULE = defaultSchedule();

type AdminBidRow = {
  sequence: number;
  userReference: string;
  bidderLabel: string;
  fullName: string | null;
  amountMinor: number;
  acceptedAt: string;
};

const BIDS_PAGE_SIZE = 100;

export default function AdminAuctionsPage() {
  const session = useSession();
  const searchParams = useSearchParams();

  const [listingReference, setListingReference] = useState('');
  const [startingBidQar, setStartingBidQar] = useState('100');
  const [incrementQar, setIncrementQar] = useState('10');
  const [startsAtLocal, setStartsAtLocal] = useState(INITIAL_SCHEDULE.startsAtLocal);
  const [endsAtLocal, setEndsAtLocal] = useState(INITIAL_SCHEDULE.endsAtLocal);
  const [openBusy, setOpenBusy] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [openNotice, setOpenNotice] = useState<string | null>(null);
  const [openedProductPath, setOpenedProductPath] = useState<string | null>(null);

  const [bidsLookupInput, setBidsLookupInput] = useState('');
  const [bidsAuctionId, setBidsAuctionId] = useState('');
  const [bids, setBids] = useState<AdminBidRow[]>([]);
  const [bidsMessage, setBidsMessage] = useState<string | null>(null);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidsHasMore, setBidsHasMore] = useState(false);

  const resolveAuctionId = useCallback(
    async (input: string): Promise<string> => {
      const trimmed = input.trim();
      if (/^lot_/i.test(trimmed)) return trimmed;
      if (/^l_/.test(trimmed)) {
        const { listing } = await apiFetch<{ listing: { liveLotReference: string | null } }>(
          `/api/listings/${encodeURIComponent(trimmed)}`,
          { headers: session.authHeaders(), cache: 'no-store' },
        );
        if (!listing.liveLotReference) {
          throw new Error('No live auction found for this product.');
        }
        return listing.liveLotReference;
      }
      throw new Error('Enter a product reference (Ad l_…) or an internal auction id.');
    },
    [session],
  );

  const fetchBids = useCallback(
    async (auctionId: string, before?: number, append = false) => {
      setBidsLoading(true);
      setBidsMessage(null);
      try {
        const query = new URLSearchParams({ limit: String(BIDS_PAGE_SIZE) });
        if (before !== undefined) query.set('before', String(before));
        const result = await apiFetch<{ bids: AdminBidRow[] }>(
          `/api/admin/auctions/${encodeURIComponent(auctionId)}/bids?${query}`,
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

  const loadBidsFromInput = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) {
        setBidsMessage('Enter a product reference or internal auction id');
        return;
      }
      try {
        const auctionId = await resolveAuctionId(trimmed);
        setBidsAuctionId(auctionId);
        await fetchBids(auctionId);
      } catch (err) {
        setBidsMessage(err instanceof Error ? err.message : 'Could not resolve auction');
        setBids([]);
        setBidsHasMore(false);
        setBidsAuctionId('');
      }
    },
    [fetchBids, resolveAuctionId],
  );

  useEffect(() => {
    const listing = searchParams.get('listing');
    if (listing) {
      setBidsLookupInput(listing);
      void loadBidsFromInput(listing);
    }
  }, [searchParams, loadBidsFromInput]);

  const loadBids = async (event: FormEvent) => {
    event.preventDefault();
    await loadBidsFromInput(bidsLookupInput);
  };

  const loadMoreBids = async () => {
    if (!bidsAuctionId || bids.length === 0) return;
    const oldest = bids.reduce((min, row) => (row.sequence < min ? row.sequence : min), bids[0].sequence);
    await fetchBids(bidsAuctionId, oldest, true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setOpenError(null);
    setOpenNotice(null);
    setOpenedProductPath(null);

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

    const startingBidMinor = qarToMinor(startingQar);
    const incrementMinor = qarToMinor(incrementQarNum);
    setOpenBusy(true);
    try {
      const created = await apiFetch<{ auction: { lotReference: string; status: string; startsAt: string } }>('/api/admin/auctions', {
        method: 'POST',
        headers: session.authHeaders(),
        json: {
          listingReference,
          startingBidMinor,
          incrementMinor,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      });
      const opened = await apiFetch<{ auction: { lotReference: string; status: string; startsAt: string } }>(
        `/api/admin/auctions/${created.auction.lotReference}/open`,
        { method: 'POST', headers: session.authHeaders() },
      );
      const scheduled =
        opened.auction.status === 'scheduled' || new Date(opened.auction.startsAt).getTime() > Date.now();
      setOpenNotice(scheduled ? 'Scheduled auction created for this product.' : 'Live auction opened for this product.');
      setOpenedProductPath(productPath({ listingReference }));
      setBidsLookupInput(listingReference);
      setBidsAuctionId(opened.auction.lotReference);
      await fetchBids(opened.auction.lotReference);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open the auction');
    } finally {
      setOpenBusy(false);
    }
  };

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title="Auctions"
        subtitle="Open timed auctions for auction-type products and review accepted bid history."
      />

      <Panel title="Open auction for product" subtitle="Amounts in QAR. Times use your browser timezone and are stored as UTC.">
        <ErrorNote>{openError}</ErrorNote>
        {openNotice && (
          <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>
            {openNotice}
            {openedProductPath ? (
              <>
                {' '}
                <Link href={openedProductPath}>View product</Link>
              </>
            ) : null}
          </p>
        )}
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-grid">
            <div>
              <Label htmlFor="auc-listing">Product reference (Ad l_…)</Label>
              <input
                id="auc-listing"
                className="field"
                value={listingReference}
                onChange={(event) => setListingReference(event.target.value)}
                placeholder="l_…"
                required
              />
            </div>
            <div>
              <Label htmlFor="auc-start">Starting bid (QAR)</Label>
              <input
                id="auc-start"
                className="field"
                value={startingBidQar}
                onChange={(event) => setStartingBidQar(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <Label htmlFor="auc-inc">Bid increment (QAR)</Label>
              <input
                id="auc-inc"
                className="field"
                value={incrementQar}
                onChange={(event) => setIncrementQar(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <Label htmlFor="auc-starts">Starts at</Label>
              <input
                id="auc-starts"
                className="field"
                type="datetime-local"
                value={startsAtLocal}
                onChange={(event) => setStartsAtLocal(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="auc-ends">Ends at</Label>
              <input
                id="auc-ends"
                className="field"
                type="datetime-local"
                value={endsAtLocal}
                onChange={(event) => setEndsAtLocal(event.target.value)}
                required
              />
            </div>
          </div>
          <Hint>Example: 100 means QAR 100.00. Current bid defaults to the starting bid when the auction opens.</Hint>
          <div className="adm-actions">
            <PrimaryButton disabled={openBusy}>{openBusy ? 'Working…' : 'Create and open'}</PrimaryButton>
          </div>
        </form>
      </Panel>

      <Panel title="Bid history" subtitle="Look up by product Ad reference; internal auction id also works for staff.">
        <form className="adm-filters" onSubmit={loadBids}>
          <div className="adm-filter" style={css('flex: 2 1 280px')}>
            <Label htmlFor="bids-lookup">Product reference</Label>
            <input
              id="bids-lookup"
              className="field"
              value={bidsLookupInput}
              onChange={(event) => setBidsLookupInput(event.target.value)}
              placeholder="l_…"
            />
          </div>
          <div className="adm-actions">
            <PrimaryButton disabled={bidsLoading}>{bidsLoading ? 'Loading…' : 'Load bids'}</PrimaryButton>
          </div>
        </form>
        <Hint>Paste the product Ad reference. An internal auction id is accepted if you already have one.</Hint>

        <StateBlock
          loading={bidsLoading && bids.length === 0}
          error={null}
          empty={!bidsLoading && bids.length === 0 && !!bidsMessage}
          emptyText={bidsMessage ?? 'No bids loaded yet.'}
        >
          {bids.length > 0 && (
            <>
              <TableWrap label="Bid history">
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
        {bidsMessage && bids.length > 0 && <p className="adm-hint" style={css('margin-top: 12px')}>{bidsMessage}</p>}
      </Panel>
    </div>
  );
}
