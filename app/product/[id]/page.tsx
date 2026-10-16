'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../lib/api';
import { css, PAGE_ROOT } from '../../../lib/css';
import { useAsync } from '../../../lib/useAsync';
import { fmtBusinessDateTime, fmtMinor, qarToMinor, relativeTimeLabel } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { AUDIENCE_LABEL, METHOD_LABEL, productPath, type AttributeField, type PublicListing } from '../../../lib/listings';
import { useLive } from '../../../lib/live';
import '../product.css';

type Category = { key: string; name: string; parentKey: string | null; depth: number };

type PublicBidRow = {
  sequence: number;
  bidderLabel: string;
  amountMinor: number;
  acceptedAt: string;
  isMine?: boolean;
};

const ORDINAL_BID_LABELS = ['1st Bid', '2nd Bid', '3rd Bid'] as const;

function bidDisplayLabel(index: number, bid: PublicBidRow): string {
  if (bid.isMine) return 'YOU';
  return ORDINAL_BID_LABELS[index] ?? `${index + 1}th Bid`;
}

function compareTopBids(a: PublicBidRow, b: PublicBidRow): number {
  if (b.amountMinor !== a.amountMinor) return b.amountMinor - a.amountMinor;
  return b.sequence - a.sequence;
}

type LiveAuctionSnapshot = {
  status: string;
  version: number;
  startingBidMinor: number;
  currentAmountMinor: number | null;
  incrementMinor: number;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  recentBids?: PublicBidRow[];
};

function mergeDisplayBids(fetched: PublicBidRow[], optimistic: PublicBidRow[]): PublicBidRow[] {
  const bySequence = new Map<number, PublicBidRow>();
  for (const row of optimistic) {
    if (!bySequence.has(row.sequence)) bySequence.set(row.sequence, row);
  }
  for (const row of fetched) {
    const existing = bySequence.get(row.sequence);
    bySequence.set(row.sequence, {
      ...row,
      ...(row.isMine === undefined && existing?.isMine ? { isMine: true } : {}),
    });
  }
  return [...bySequence.values()].sort(compareTopBids).slice(0, 3);
}

function minimumNextBidMinor(
  startingBidMinor: number,
  bidCount: number,
  currentAmountMinor: number | null,
  incrementMinor: number,
): number {
  if (bidCount === 0) return startingBidMinor;
  return (currentAmountMinor ?? 0) + incrementMinor;
}

function liveTopBidLabel(
  startingBidMinor: number | null,
  currentAmountMinor: number | null,
  bidCount: number | null,
): string {
  if (typeof startingBidMinor !== 'number') return 'Bid amounts loading…';
  const hasBids =
    (bidCount ?? 0) > 0 ||
    (typeof currentAmountMinor === 'number' && currentAmountMinor > startingBidMinor);
  if (hasBids && typeof currentAmountMinor === 'number') return fmtMinor(currentAmountMinor);
  return `No bids yet — opening at ${fmtMinor(startingBidMinor)}`;
}

function postedLabel(iso: string | null): string {
  if (!iso) return 'Not published';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(iso).toLocaleDateString()}`;
}

function attributeText(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * A published listing.
 *
 * Every field here comes from the public projection: private staff notes, admin-only attribute
 * values, seller contact details and internal moderation state are not merely hidden in the
 * markup, they are never sent (`modules/listings/dto.ts`). Images are served by the listing's own
 * media route, which authorizes each request against the published record.
 *
 * Live auction listings show starting bid, schedule, inline bidding, and realtime updates when staff
 * have opened a lot; other methods show enquiry-first pricing until checkout is approved.
 */
export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [shotIdx, setShotIdx] = useState(0);
  const [tab, setTab] = useState<'description' | 'specifications' | 'location'>('description');
  const session = useSession();
  const [amountQar, setAmountQar] = useState('');
  const [bidMessage, setBidMessage] = useState<string | null>(null);
  const [bidCooldownUntil, setBidCooldownUntil] = useState<number | null>(null);
  const [flashAmountMinor, setFlashAmountMinor] = useState<number | null>(null);
  const [flashBidCount, setFlashBidCount] = useState<number | null>(null);
  const [optimisticBids, setOptimisticBids] = useState<PublicBidRow[]>([]);
  const productReturnTo = id ? `/product/${encodeURIComponent(id)}` : '/';

  const listing = useAsync<{ listing: PublicListing }>(
    () => apiFetch<{ listing: PublicListing }>(`/api/listings/${encodeURIComponent(id)}`, { cache: 'no-store' }),
    [id],
  );
  const categories = useAsync<{ categories: Category[] }>(() => apiFetch<{ categories: Category[] }>('/api/catalog/categories', { cache: 'no-store' }), []);

  const categoryKey = listing.data?.listing.category.key ?? '';
  const schema = useAsync<{ schema: { version: number; fields: AttributeField[] } | null }>(
    () => (categoryKey ? apiFetch(`/api/catalog/attribute-schemas/${encodeURIComponent(categoryKey)}/current`, { cache: 'no-store' }) : Promise.resolve({ schema: null })),
    [categoryKey],
  );

  const related = useAsync<{ listings: PublicListing[] }>(
    () =>
      categoryKey
        ? apiFetch<{ listings: PublicListing[] }>(`/api/listings?category=${encodeURIComponent(categoryKey)}&limit=4`, { cache: 'no-store' })
        : Promise.resolve({ listings: [] }),
    [categoryKey],
  );

  const liveLotRef = listing.data?.listing.liveLotReference ?? null;
  const viewerReference = session.user?.publicReference ?? null;
  const liveAuction = useAsync<{ auction: LiveAuctionSnapshot } | null>(
    () => {
      if (!liveLotRef) return Promise.resolve(null);
      return apiFetch<{ auction: LiveAuctionSnapshot }>(`/api/auctions/${encodeURIComponent(liveLotRef)}`, {
        cache: 'no-store',
        headers: session.status === 'authenticated' ? session.authHeaders() : undefined,
      });
    },
    [liveLotRef, viewerReference, session.status],
  );
  const seenAuctionVersion = liveAuction.data?.auction.version ?? 0;
  const liveSocket = useLive((event) => {
    if (event.auctionId !== liveLotRef) return;
    if (event.version <= seenAuctionVersion) return;
    const amountMinor = typeof event.data.amountMinor === 'number' ? event.data.amountMinor : null;
    const sequence = typeof event.data.sequence === 'number' ? event.data.sequence : null;
    if (amountMinor !== null) setFlashAmountMinor(amountMinor);
    if (sequence !== null) {
      setFlashBidCount(sequence);
      if (amountMinor !== null) {
        setOptimisticBids((prev) => {
          if (prev.some((row) => row.sequence === sequence)) return prev;
          const row: PublicBidRow = {
            sequence,
            amountMinor,
            bidderLabel: '',
            acceptedAt: event.occurredAt || new Date().toISOString(),
          };
          return [...prev, row];
        });
      }
    }
    liveAuction.reload({ soft: true });
  });
  useEffect(() => {
    const serverBids = liveAuction.data?.auction.recentBids ?? [];
    const serverSequences = new Set(serverBids.map((row) => row.sequence));
    setOptimisticBids((prev) => prev.filter((row) => !serverSequences.has(row.sequence)));
    setFlashAmountMinor(null);
    setFlashBidCount(null);
  }, [liveAuction.data?.auction.version]);
  useEffect(() => {
    if (liveSocket || !liveLotRef) return;
    const timer = setInterval(() => liveAuction.reload({ soft: true }), 15_000);
    return () => clearInterval(timer);
  }, [liveSocket, liveLotRef, liveAuction]);

  useEffect(() => {
    if (!bidCooldownUntil) return;
    const tick = () => {
      if (Date.now() >= bidCooldownUntil) {
        setBidCooldownUntil(null);
        setBidMessage(null);
        return;
      }
      const seconds = Math.ceil((bidCooldownUntil - Date.now()) / 1000);
      setBidMessage((prev) => {
        const base = prev?.split('. Try again')[0] ?? 'Wait before bidding again';
        return `${base}. Try again in ${seconds}s.`;
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bidCooldownUntil]);

  const placeBid = async (event: FormEvent) => {
    event.preventDefault();
    if (!liveLotRef || !liveAuction.data?.auction) return;
    setBidMessage(null);
    setBidCooldownUntil(null);
    const amountMinor = qarToMinor(Number(amountQar));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setBidMessage('Enter an amount in QAR');
      return;
    }
    const live = liveAuction.data.auction;
    const effectiveBidCount = flashBidCount ?? live.bidCount;
    const effectiveCurrent = flashAmountMinor ?? live.currentAmountMinor;
    const minimumMinor = minimumNextBidMinor(
      live.startingBidMinor,
      effectiveBidCount,
      effectiveCurrent,
      live.incrementMinor,
    );
    if (amountMinor < minimumMinor) {
      setBidMessage(
        `Your bid must be at least ${fmtMinor(minimumMinor)} (current top bid plus ${fmtMinor(live.incrementMinor)} increment)`,
      );
      return;
    }
    try {
      await apiFetch(`/api/auctions/${encodeURIComponent(liveLotRef)}/bids`, {
        method: 'POST',
        headers: { ...session.authHeaders(), 'idempotency-key': crypto.randomUUID() },
        json: { amountMinor, expectedVersion: live.version },
      });
      setAmountQar('');
      setBidMessage('Bid accepted');
      const nextSequence = effectiveBidCount + 1;
      setFlashAmountMinor(amountMinor);
      setFlashBidCount(nextSequence);
      setOptimisticBids((prev) => {
        if (prev.some((row) => row.sequence === nextSequence)) return prev;
        const row: PublicBidRow = {
          sequence: nextSequence,
          amountMinor,
          bidderLabel: '',
          isMine: true,
          acceptedAt: new Date().toISOString(),
        };
        return [...prev, row];
      });
      await liveAuction.reload({ soft: true });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setBidMessage(err.message);
        const retryAfterMs = err.body.details?.retryAfterMs;
        if (typeof retryAfterMs === 'number' && retryAfterMs > 0) {
          setBidCooldownUntil(Date.now() + retryAfterMs);
        }
      } else {
        setBidMessage(err instanceof Error ? err.message : 'Bid was not accepted');
      }
      liveAuction.reload({ soft: true });
    }
  };

  useEffect(() => {
    setShotIdx(0);
    setTab('description');
    setAmountQar('');
    setBidMessage(null);
    setBidCooldownUntil(null);
    setFlashAmountMinor(null);
    setFlashBidCount(null);
    setOptimisticBids([]);
  }, [id]);

  const data = listing.data?.listing ?? null;
  const media = data?.media ?? [];
  const shot = media[Math.min(shotIdx, Math.max(0, media.length - 1))] ?? null;

  const attributeLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of schema.data?.schema?.fields ?? []) map.set(field.key, field.labelEn);
    return map;
  }, [schema.data]);

  const relatedListings = (related.data?.listings ?? []).filter((entry) => entry.listingReference !== id).slice(0, 4);
  const category = (categories.data?.categories ?? []).find((entry) => entry.key === categoryKey) ?? null;

  if (listing.loading && !listing.data) {
    return (
      <div style={css(PAGE_ROOT)}>
        <SiteHeader active="buy" navCurrent={false} />
        <p role="status" className="mkt-state" data-state="loading" style={css('max-width: 1240px; margin: 32px auto; padding: 18px')}>
          Loading listing…
        </p>
        <SiteFooter />
      </div>
    );
  }

  if (listing.error || !data) {
    const missing = listing.error?.toString().includes('not found') || !data;
    return (
      <div style={css(PAGE_ROOT)}>
        <title>Listing not available — Araq &amp; Kahraman Auctions</title>
        <SiteHeader active="buy" navCurrent={false} />
        <section style={css('max-width: 720px; margin: 0 auto; padding: 72px 24px 96px')}>
          <h1 style={css("margin: 0 0 10px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 30px; font-weight: 700")}>
            {missing ? 'This listing is not available' : 'The listing could not be loaded'}
          </h1>
          <p style={css('margin: 0 0 12px; color: #5B636B')}>
            {missing
              ? 'It may have been withdrawn, archived, or it was never published. Archived listings leave public view but keep their history internally.'
              : listing.error}
          </p>
          <div style={css('display: flex; gap: 10px; flex-wrap: wrap')}>
            {listing.error && (
              <button type="button" onClick={() => listing.reload()} className="btn-primary" style={css('height: 48px; padding: 0 20px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>
                Try again
              </button>
            )}
            <Link href="/browse" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border: 1px solid #DAD7D0; border-radius: 12px; font-weight: 600')}>
              Browse published listings
            </Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  const tabs = [
    { id: 'description' as const, label: 'Description' },
    { id: 'specifications' as const, label: 'Specifications' },
    { id: 'location' as const, label: 'Location' },
  ];
  const publicAttributes = Object.entries(data.attributes);
  const isLiveAuction = data.listingMethod === 'auction' && Boolean(data.liveLotReference);
  const fetchedAuction = liveAuction.data?.auction ?? null;
  const startingBidMinor = data.startingBidMinor ?? fetchedAuction?.startingBidMinor ?? null;
  const currentAmountMinor =
    flashAmountMinor ?? fetchedAuction?.currentAmountMinor ?? data.currentAmountMinor ?? null;
  const bidCount = flashBidCount ?? fetchedAuction?.bidCount ?? data.bidCount ?? null;
  const auctionStartsAt = data.startsAt ?? fetchedAuction?.startsAt ?? null;
  const auctionEndsAt = data.endsAt ?? fetchedAuction?.endsAt ?? null;
  const fetchedRecentBids = fetchedAuction?.recentBids ?? [];
  const displayBids = mergeDisplayBids(fetchedRecentBids, optimisticBids);
  const incrementMinor = fetchedAuction?.incrementMinor ?? 0;
  const effectiveBidCountForMinimum = bidCount ?? 0;
  const minimumMinor =
    typeof startingBidMinor === 'number'
      ? minimumNextBidMinor(
          startingBidMinor,
          effectiveBidCountForMinimum,
          currentAmountMinor,
          incrementMinor,
        )
      : null;
  const minimumQarPlaceholder =
    minimumMinor !== null
      ? minimumMinor % 100 === 0
        ? String(minimumMinor / 100)
        : (minimumMinor / 100).toFixed(2)
      : '';
  const auctionLive = fetchedAuction?.status === 'live';

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{`${data.title.en ?? data.title.ar ?? 'Listing'} — Araq & Kahraman Auctions`}</title>
      <SiteHeader active="buy" navCurrent={false} />

      <div style={css('max-width: 1240px; margin: 0 auto; padding: 24px 24px 0')}>
        <nav aria-label="Breadcrumb" style={css('font-size: 14px; color: #5B636B; display: flex; flex-wrap: wrap; gap: 6px')}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/browse">Browse</Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={`/browse?category=${category.key}`}>{category.name}</Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span>{data.title.en ?? data.listingReference}</span>
        </nav>
      </div>

      <div style={css('max-width: 1240px; margin: 0 auto; padding: 18px 24px 0; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-start')}>
        <section aria-label="Photos" style={css('flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 12px')}>
          <div style={css('position: relative; height: clamp(300px, 42vw, 520px); border-radius: 20px; background: #F3F1EC; display: flex; align-items: center; justify-content: center; overflow: hidden')}>
            {shot ? (
              <img
                src={`${API_BASE_URL}${shot.url}`}
                alt={shot.alt.en ?? shot.alt.ar ?? (data.title.en ?? 'Listing photo')}
                style={css('width: 100%; height: 100%; object-fit: contain')}
              />
            ) : (
              <span style={css('color: #5B636B')}>No image published for this listing</span>
            )}
            {shot && (
              <span style={css('position: absolute; left: 16px; bottom: 16px; padding: 6px 12px; border-radius: 999px; background: rgba(21,25,30,.72); color: #FFFFFF; font-size: 13px; font-weight: 600')}>
                {shot.isCover ? 'Cover' : `Photo ${shotIdx + 1}`} · {shotIdx + 1} / {media.length}
              </span>
            )}
          </div>
          {media.length > 1 && (
            <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px')}>
              {media.map((entry, index) => (
                <button
                  key={entry.assetId}
                  type="button"
                  onClick={() => setShotIdx(index)}
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={index === shotIdx}
                  style={css(`height: 84px; border-radius: 12px; background: #F3F1EC; cursor: pointer; border: 2px solid ${index === shotIdx ? '#9A6B12' : 'transparent'}; padding: 0; overflow: hidden`)}
                >
                  <img src={`${API_BASE_URL}${entry.url}`} alt={entry.alt.en ?? ''} style={css('width: 100%; height: 100%; object-fit: cover')} loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="mkt-hint">
            Images are served from the listing&apos;s own media route. Uploaded metadata is stripped by the server
            before an image is stored.
          </p>
        </section>

        <aside aria-label="Listing summary" style={css('flex: 1 1 360px; min-width: 0; display: flex; flex-direction: column; gap: 16px')}>
          <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 18px')}>
            <div>
              <div style={css('font-size: 13px; color: #5B636B; font-weight: 600')}>
                {METHOD_LABEL[data.listingMethod]}
                {data.condition ? ` · ${data.condition.replace('_', ' ')}` : ''}
                {data.audience ? ` · For ${AUDIENCE_LABEL[data.audience].toLowerCase()}` : ''}
              </div>
              <h1 style={css("margin: 6px 0 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2")}>
                {data.title.en ?? data.title.ar}
              </h1>
              {data.languageMode !== 'en' && data.title.ar && data.languageMode === 'both' && (
                <p dir="rtl" style={css('margin: 6px 0 0; font-size: 20px; color: #2A3036')}>
                  {data.title.ar}
                </p>
              )}
              <p style={css('margin: 8px 0 0; font-size: 14px; color: #5B636B')}>
                {data.location.label ?? 'Location not published'} · {postedLabel(data.publishedAt)} · Ad {data.listingReference}
              </p>
            </div>

            {isLiveAuction ? (
              <div style={css('padding: 16px 18px; border-radius: 14px; background: #F6EEDC; color: #3D3420; display: flex; flex-direction: column; gap: 16px')}>
                <style>{`
                  .live-auction-bid-row {
                    display: grid;
                    gap: 10px;
                    grid-template-columns: 1fr;
                  }
                  @media (min-width: 520px) {
                    .live-auction-bid-row {
                      grid-template-columns: 1fr auto;
                      align-items: end;
                    }
                    .live-auction-bid-row button[type='submit'] {
                      width: auto;
                      white-space: nowrap;
                    }
                  }
                  .live-auction-outline-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1 1 160px;
                    min-height: 48px;
                    padding: 0 18px;
                    border: 1px solid #9A6B12;
                    border-radius: 12px;
                    font-weight: 700;
                    color: #3D3420;
                    background: rgba(255, 255, 255, 0.35);
                    text-decoration: none;
                    box-sizing: border-box;
                  }
                `}</style>
                <div>
                  <strong style={css('display: block; font-size: 15px')}>Live auction</strong>
                  <p className="mkt-hint" style={css('color: #3D3420; margin: 4px 0 0')}>
                    Times shown in Qatar (Asia/Qatar).
                  </p>
                </div>
                <div style={css('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
                  <div style={css('background: rgba(255,255,255,.55); border-radius: 12px; padding: 10px 12px')}>
                    <div style={css('font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #5B636B')}>Starting price</div>
                    <div style={css('font-weight: 700; font-size: 17px; margin-top: 4px')}>
                      {typeof startingBidMinor === 'number' ? fmtMinor(startingBidMinor) : 'Loading…'}
                    </div>
                  </div>
                  <div style={css('background: rgba(255,255,255,.55); border-radius: 12px; padding: 10px 12px')}>
                    <div style={css('font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #5B636B')}>Current top bid</div>
                    <div style={css('font-weight: 700; font-size: 17px; margin-top: 4px')}>
                      {liveTopBidLabel(startingBidMinor, currentAmountMinor, bidCount)}
                    </div>
                  </div>
                  <div style={css('background: rgba(255,255,255,.55); border-radius: 12px; padding: 10px 12px')}>
                    <div style={css('font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #5B636B')}>Starts</div>
                    <div style={css('font-weight: 600; margin-top: 4px')}>
                      {auctionStartsAt ? fmtBusinessDateTime(auctionStartsAt) : 'Loading…'}
                    </div>
                  </div>
                  <div style={css('background: rgba(255,255,255,.55); border-radius: 12px; padding: 10px 12px')}>
                    <div style={css('font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #5B636B')}>Ends</div>
                    <div style={css('font-weight: 600; margin-top: 4px')}>
                      {auctionEndsAt ? fmtBusinessDateTime(auctionEndsAt) : 'Loading…'}
                    </div>
                  </div>
                </div>
                {displayBids.length > 0 ? (
                  <div>
                    <div style={css('font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #5B636B; margin-bottom: 8px')}>
                      Recent bids
                    </div>
                    <ul style={css('list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px')}>
                      {displayBids.map((bid, index) => (
                        <li
                          key={bid.sequence}
                          style={css('display: flex; justify-content: space-between; gap: 12px; align-items: baseline; background: rgba(255,255,255,.55); border-radius: 12px; padding: 12px 14px')}
                        >
                          <span style={css('font-weight: 600')}>{bidDisplayLabel(index, bid)}</span>
                          <span style={css('text-align: right')}>
                            <span style={css('display: block; font-weight: 700')}>{fmtMinor(bid.amountMinor)}</span>
                            <span className="mkt-hint" style={css('font-size: 13px')}>{relativeTimeLabel(bid.acceptedAt)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : liveAuction.loading ? (
                  <p className="mkt-hint" role="status" style={css('margin: 0')}>Loading bid history…</p>
                ) : (
                  <p className="mkt-hint" style={css('margin: 0')}>No bids yet — be the first.</p>
                )}
                {auctionLive && session.user ? (
                  <form onSubmit={placeBid} style={css('display: grid; gap: 10px')}>
                    <span style={css('font-size: 14px; font-weight: 600')}>Your bid (QAR)</span>
                    <div className="live-auction-bid-row">
                      <input
                        value={amountQar}
                        onChange={(e) => setAmountQar(e.target.value)}
                        inputMode="decimal"
                        placeholder={minimumQarPlaceholder}
                        required
                        aria-label="Your bid in QAR"
                        style={css('height: 48px; padding: 0 14px; border: 1px solid #DAD7D0; border-radius: 12px; font: inherit; width: 100%; box-sizing: border-box; background: #FFFFFF')}
                      />
                      <button
                        type="submit"
                        disabled={bidCooldownUntil !== null && Date.now() < bidCooldownUntil}
                        className="btn-primary"
                        style={css('height: 48px; min-width: 0; width: 100%; padding: 0 22px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer; box-sizing: border-box')}
                      >
                        Place bid
                      </button>
                    </div>
                    {minimumMinor !== null && incrementMinor > 0 ? (
                      <p style={css('margin: 0; font-size: 14px; font-weight: 600; color: #3D3420; line-height: 1.45')}>
                        {effectiveBidCountForMinimum === 0
                          ? `Enter at least ${fmtMinor(minimumMinor)} (opening bid).`
                          : `Minimum next bid: ${fmtMinor(minimumMinor)} (current + ${fmtMinor(incrementMinor)} increment).`}
                      </p>
                    ) : minimumMinor !== null ? (
                      <p style={css('margin: 0; font-size: 14px; font-weight: 600; color: #3D3420; line-height: 1.45')}>
                        Enter at least {fmtMinor(minimumMinor)}.
                      </p>
                    ) : null}
                  </form>
                ) : null}
                {auctionLive && !session.user ? (
                  <p style={css('margin: 0')}>
                    <Link href={`/signin?returnTo=${encodeURIComponent(productReturnTo)}`} style={css('font-weight: 700')}>
                      Sign in
                    </Link>{' '}
                    to place a bid.
                  </p>
                ) : null}
                {bidMessage ? (
                  <p role="status" style={css('margin: 0; font-weight: 600')}>{bidMessage}</p>
                ) : null}
                <div style={css('display: flex; flex-wrap: wrap; gap: 10px')}>
                  <Link
                    href={`/contact?ref=${encodeURIComponent(data.listingReference)}`}
                    className="live-auction-outline-btn"
                  >
                    Enquire about this listing
                  </Link>
                  <Link href="/account" className="live-auction-outline-btn">
                    Your bids and wins
                  </Link>
                </div>
                <p className="mkt-hint" role="status" style={css('margin: 0; font-size: 13px; color: #5B636B')}>
                  {liveSocket ? 'Live bid updates enabled.' : 'Checking for new bids every 15 seconds.'}
                </p>
              </div>
            ) : data.listingMethod === 'auction' ? (
              <div style={css('padding: 14px 16px; border-radius: 14px; background: #FBFAF7; border: 1px solid #EEECE7; color: #3D3420')}>
                <p className="mkt-hint" style={css('margin: 0')}>
                  This listing is recorded for auction. Staff will open bidding on this listing when it should begin — there is no
                  bid button until then.
                </p>
                <div style={css('display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px')}>
                  <Link href={`/contact?ref=${encodeURIComponent(data.listingReference)}`} style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 18px; border: 1px solid #15191E; border-radius: 12px; font-weight: 700')}>
                    Enquire about this listing
                  </Link>
                  <Link href="/account" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 18px; border: 1px solid #DAD7D0; border-radius: 12px; font-weight: 600')}>
                    Your bids and wins
                  </Link>
                </div>
              </div>
            ) : (
              <div style={css('padding: 14px 16px; border-radius: 14px; background: #F6EEDC; color: #3D3420')}>
                <strong style={css('display: block; margin-bottom: 4px')}>No published price yet</strong>
                <p className="mkt-hint" style={css('color: #3D3420')}>
                  Fixed-price checkout is not available. Send an enquiry and our team will follow up with pricing.
                </p>
                <div style={css('display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px')}>
                  <Link href={`/contact?ref=${encodeURIComponent(data.listingReference)}`} className="btn-primary" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 18px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}>
                    Enquire about this listing
                  </Link>
                  <Link href="/account" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 18px; border: 1px solid #DAD7D0; border-radius: 12px; font-weight: 600')}>
                    Your bids and wins
                  </Link>
                </div>
              </div>
            )}

            <div style={css('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
              <div style={css('background: #FBFAF7; border: 1px solid #EEECE7; border-radius: 12px; padding: 10px 12px')}>
                <div style={css('font-size: 12px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em')}>Category</div>
                <div style={css('font-weight: 600')}>{category?.name ?? data.category.key}</div>
              </div>
              <div style={css('background: #FBFAF7; border: 1px solid #EEECE7; border-radius: 12px; padding: 10px 12px')}>
                <div style={css('font-size: 12px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em')}>Location</div>
                <div style={css('font-weight: 600')}>{data.location.label ?? 'Not published'}</div>
              </div>
              <div style={css('background: #FBFAF7; border: 1px solid #EEECE7; border-radius: 12px; padding: 10px 12px')}>
                <div style={css('font-size: 12px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em')}>Method</div>
                <div style={css('font-weight: 600')}>{METHOD_LABEL[data.listingMethod]}</div>
              </div>
              <div style={css('background: #FBFAF7; border: 1px solid #EEECE7; border-radius: 12px; padding: 10px 12px')}>
                <div style={css('font-size: 12px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em')}>Images</div>
                <div style={css('font-weight: 600')}>{media.length}</div>
              </div>
            </div>

          </div>

          <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
            <div style={css('display: flex; gap: 14px; align-items: center')}>
              <span aria-hidden="true" style={css("width: 52px; height: 52px; border-radius: 50%; background: #15191E; color: #D4A84B; display: flex; align-items: center; justify-content: center; font-family: 'Schibsted Grotesk', sans-serif; font-weight: 700; font-size: 18px")}>
                {data.seller.displayName.slice(0, 2).toUpperCase()}
              </span>
              <div style={css('min-width: 0')}>
                <div style={css('font-weight: 700; display: flex; align-items: center; gap: 6px')}>
                  {data.seller.displayName}
                  {data.seller.verificationBadge && <span className="mkt-badge">Verified</span>}
                </div>
                <div className="mkt-hint">Seller {data.seller.sellerReference}</div>
              </div>
            </div>
            <p className="mkt-hint">
              Contact details are held by our team rather than published, so enquiries are handled through the
              marketplace.
            </p>
            <Link href={`/contact?ref=${encodeURIComponent(data.listingReference)}`} style={css('font-weight: 600; font-size: 15px')}>
              Send an enquiry →
            </Link>
          </div>

          <div style={css('background: #F6EEDC; border-radius: 20px; padding: 20px')}>
            <h2 style={css('margin: 0 0 8px; font-size: 16px; font-weight: 700')}>Stay safe</h2>
            <ul style={css('margin: 0; padding-left: 20px; font-size: 14px; color: #3D3420; display: flex; flex-direction: column; gap: 4px')}>
              <li>Inspect the item before paying anything.</li>
              <li>Never send a deposit to someone you have not met.</li>
              <li>Report anything that looks wrong — the ad reference is {data.listingReference}.</li>
            </ul>
          </div>
        </aside>
      </div>

      <section style={css('max-width: 1240px; margin: 0 auto; padding: 40px 24px 0')}>
        <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 20px; overflow: hidden')}>
          <div role="tablist" aria-label="Listing details" style={css('display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid #E6E4DF; padding: 0 16px')}>
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                onClick={() => setTab(entry.id)}
                style={css(`height: 56px; padding: 0 16px; border: 0; background: transparent; font: inherit; font-weight: 600; font-size: 15px; cursor: pointer; color: ${tab === entry.id ? '#15191E' : '#5B636B'}; box-shadow: inset 0 -3px 0 ${tab === entry.id ? '#9A6B12' : 'transparent'}`)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div style={css('padding: 28px')}>
            {tab === 'description' && (
              <div style={css('max-width: 72ch; color: #2A3036; display: flex; flex-direction: column; gap: 14px')}>
                {(data.description.en ?? data.description.ar ?? '').split('\n').filter(Boolean).map((paragraph, index) => (
                  <p key={index} style={css('margin: 0')}>
                    {paragraph}
                  </p>
                ))}
                {data.languageMode === 'both' && data.description.ar && (
                  <p dir="rtl" style={css('margin: 0')}>
                    {data.description.ar}
                  </p>
                )}
                {!data.description.en && !data.description.ar && <p style={css('margin: 0')}>No description was published.</p>}
              </div>
            )}

            {tab === 'specifications' && (
              <>
                {publicAttributes.length === 0 ? (
                  <p className="mkt-hint">This category defines no additional published attributes for this listing.</p>
                ) : (
                  <dl style={css('margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0 32px')}>
                    {publicAttributes.map(([key, value]) => (
                      <div key={key} style={css('display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #EEECE7')}>
                        <dt style={css('color: #5B636B')}>{attributeLabels.get(key) ?? key}</dt>
                        <dd style={css('margin: 0; font-weight: 600; text-align: right')}>{attributeText(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="mkt-hint" style={css('margin-top: 14px')}>
                  Only attributes marked for public display are sent to this page; staff-only fields stay on the server.
                </p>
              </>
            )}

            {tab === 'location' && (
              <div style={css('display: flex; flex-direction: column; gap: 10px')}>
                {data.location.publicPrecision === 'hidden' || !data.location.label ? (
                  <p className="mkt-hint">This listing does not publish a location.</p>
                ) : (
                  <>
                    <strong style={css('color: #15191E')}>
                      {data.location.label}
                      {data.location.areaKey && data.location.publicPrecision !== 'city' ? ` · ${data.location.areaKey}` : ''}
                    </strong>
                    <span className="mkt-hint">
                      Published at {data.location.publicPrecision} precision. Exact addresses are only shared when the
                      seller agreed to it.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p style={css('margin: 14px 0 0; font-size: 14px; color: #5B636B')}>
          Something wrong with this ad?{' '}
          <Link href={`/contact?ref=${encodeURIComponent(data.listingReference)}`} style={css('font-weight: 600')}>
            Report it
          </Link>
        </p>
      </section>

      {relatedListings.length > 0 && (
        <section style={css('max-width: 1240px; margin: 0 auto; padding: 48px 24px 80px')}>
          <div style={css('display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 20px; flex-wrap: wrap')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; letter-spacing: -0.02em; font-weight: 700")}>Related listings</h2>
            <Link href={`/browse?category=${encodeURIComponent(categoryKey)}`} style={css('font-weight: 600')}>
              View all →
            </Link>
          </div>
          <div style={css('display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px')}>
            {relatedListings.map((entry) => {
              const cover = entry.media.find((item) => item.assetId === entry.coverAssetId) ?? entry.media[0] ?? null;
              return (
                <Fragment key={entry.listingReference}>
                  <article className="card" style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden')}>
                    <Link href={productPath(entry)} style={css('height: 150px; background: #F3F1EC; display: flex; align-items: center; justify-content: center; overflow: hidden')}>
                      {cover ? (
                        <img src={`${API_BASE_URL}${cover.url}`} alt={cover.alt.en ?? entry.title.en ?? ''} style={css('width: 100%; height: 100%; object-fit: cover')} loading="lazy" />
                      ) : (
                        <span className="mkt-hint">No image</span>
                      )}
                    </Link>
                    <div style={css('padding: 14px 16px 16px')}>
                      <h3 style={css('margin: 0; font-size: 15px; font-weight: 600')}>
                        <Link href={productPath(entry)} style={css('color: #15191E')}>
                          {entry.title.en ?? entry.title.ar ?? entry.listingReference}
                        </Link>
                      </h3>
                      <p className="mkt-hint" style={css('margin-top: 6px')}>
                        {METHOD_LABEL[entry.listingMethod]} · {entry.location.label ?? 'Location not published'}
                      </p>
                    </div>
                  </article>
                </Fragment>
              );
            })}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
