'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import CheckoutDetailsFields, { type CheckoutDetails } from '../../../components/CheckoutDetailsFields';
import ProductListingCard from '../../../components/ProductListingCard';
import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../lib/api';
import { css, PAGE_ROOT } from '../../../lib/css';
import { useAsync } from '../../../lib/useAsync';
import { fmtBusinessDateTime, fmtMinor, qarToMinor, relativeTimeLabel } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import {
  AUDIENCE_LABEL,
  listingDetailApiPath,
  mediaUrl,
  METHOD_LABEL,
  productPath,
  type AttributeField,
  type PublicListing,
} from '../../../lib/listings';
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

function bidDisplayLabel(bid: PublicBidRow): string {
  const name = bid.bidderLabel.trim();
  if (bid.isMine) return name ? `${name} (You)` : 'You';
  return name || 'Bidder';
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

function ProductPageSkeleton() {
  return (
    <div className="product-skeleton-page" aria-busy="true" role="status">
      <span className="sr">Loading product</span>
      <div className="product-breadcrumb">
        <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 220px')} />
      </div>
      <div className="product-layout">
        <div className="product-left">
          <div className="product-gallery">
            <div className="product-skeleton-shimmer product-skeleton-gallery" />
            <div className="product-skeleton-thumb-row">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="product-skeleton-shimmer product-skeleton-thumb" />
              ))}
            </div>
            <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 85%; margin-top: 4px')} />
          </div>
          <div className="product-tabs-panel">
            <div className="product-tabs-list" style={css('padding: 12px 16px; gap: 12px')}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="product-skeleton-shimmer product-skeleton-line" style={css('width: 96px; height: 18px')} />
              ))}
            </div>
            <div className="product-tabs-body" style={css('display: flex; flex-direction: column; gap: 12px')}>
              <div className="product-skeleton-shimmer product-skeleton-line product-skeleton-line--lg" style={css('width: 100%')} />
              <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 92%')} />
              <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 78%')} />
              <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 88%')} />
            </div>
          </div>
        </div>
        <aside className="product-sidebar" aria-hidden="true">
          <div className="product-sidebar-card" style={css('gap: 14px')}>
            <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 55%')} />
            <div className="product-skeleton-shimmer product-skeleton-line product-skeleton-line--xl" style={css('width: 100%')} />
            <div className="product-skeleton-shimmer product-skeleton-line" style={css('width: 70%')} />
            <div className="product-skeleton-shimmer product-skeleton-block" />
            <div className="product-skeleton-shimmer product-skeleton-btn" />
          </div>
          <div className="product-skeleton-shimmer" style={css('height: 100px; border-radius: 20px')} />
        </aside>
      </div>
    </div>
  );
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
  const { lang } = useUiLocale();
  const [amountQar, setAmountQar] = useState('');
  const [bidMessage, setBidMessage] = useState<string | null>(null);
  const [bidCooldownUntil, setBidCooldownUntil] = useState<number | null>(null);
  const [flashAmountMinor, setFlashAmountMinor] = useState<number | null>(null);
  const [flashBidCount, setFlashBidCount] = useState<number | null>(null);
  const [optimisticBids, setOptimisticBids] = useState<PublicBidRow[]>([]);
  const router = useRouter();
  const productReturnTo = id ? `/product/${encodeURIComponent(id)}` : '/';
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buyForm, setBuyForm] = useState<CheckoutDetails>({ fullName: '', phone: '', city: '', address: '' });
  const [buyPrefilled, setBuyPrefilled] = useState(false);

  const listing = useAsync<{ listing: PublicListing }>(
    () => {
      const path = listingDetailApiPath(id);
      if (!path) {
        return Promise.reject(new ApiRequestError(404, { code: 'NOT_FOUND', message: 'Listing not found', fieldErrors: {}, requestId: '', details: {} }));
      }
      return apiFetch<{ listing: PublicListing }>(path, { cache: 'no-store' });
    },
    [id],
  );
  const categories = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${lang}`, { cache: 'no-store' }),
    [lang],
  );

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
  const account = useAsync<{ orders: Array<{ orderReference: string; listingReference: string; paymentState: string }> }>(
    () =>
      session.status === 'authenticated'
        ? apiFetch('/api/account', { cache: 'no-store', headers: session.authHeaders() })
        : Promise.resolve({ orders: [] }),
    [session.status, viewerReference],
  );
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

  useEffect(() => {
    if (!buyOpen || buyPrefilled || session.status !== 'authenticated' || !session.user) return;
    setBuyForm((prev) => ({
      ...prev,
      fullName: prev.fullName || session.user!.fullName || '',
      phone: prev.phone || session.user!.phone || '',
    }));
    setBuyPrefilled(true);
  }, [buyOpen, buyPrefilled, session.status, session.user]);

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
          bidderLabel: session.user?.fullName ?? '',
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

  const relatedListings = (related.data?.listings ?? [])
    .filter((entry) => entry.listingReference !== data?.listingReference)
    .slice(0, 4);
  const category = (categories.data?.categories ?? []).find((entry) => entry.key === categoryKey) ?? null;

  if (listing.loading && !listing.data) {
    return (
      <div style={css(PAGE_ROOT)}>
        <SiteHeader active="buy" navCurrent={false} />
        <ProductPageSkeleton />
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
  const unpaidWinOrder = account.data?.orders.find(
    (order) =>
      order.listingReference === data.listingReference &&
      (order.paymentState === 'awaiting_payment' || order.paymentState === 'failed'),
  );

  const submitBuy = async (event: FormEvent) => {
    event.preventDefault();
    if (session.status !== 'authenticated') {
      router.push(`/signin?returnTo=${encodeURIComponent(productReturnTo)}`);
      return;
    }
    setBuyError(null);
    setBuyBusy(true);
    try {
      const result = await apiFetch<{ order: { orderReference: string } }>(
        `/api/listings/${encodeURIComponent(data.listingReference)}/buy`,
        { method: 'POST', headers: session.authHeaders(), json: buyForm },
      );
      router.push(`/account/orders/${encodeURIComponent(result.order.orderReference)}`);
    } catch (err) {
      setBuyError(err instanceof ApiRequestError ? err.message : err instanceof Error ? err.message : 'Buy could not be completed');
    } finally {
      setBuyBusy(false);
    }
  };

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{`${data.title.en ?? data.title.ar ?? 'Listing'} — Araq & Kahraman Auctions`}</title>
      <SiteHeader active="buy" navCurrent={false} />

      <nav className="product-breadcrumb" aria-label="Breadcrumb">
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

      <div className="product-layout">
        <div className="product-left">
        <section className="product-gallery" aria-label="Photos">
          <div className="product-gallery-main">
            {shot ? (
              <img
                src={mediaUrl(API_BASE_URL, shot.url)}
                alt={shot.alt.en ?? shot.alt.ar ?? (data.title.en ?? 'Listing photo')}
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
            <div className="product-gallery-thumbs">
              {media.map((entry, index) => (
                <button
                  key={entry.assetId}
                  type="button"
                  className="product-gallery-thumb"
                  onClick={() => setShotIdx(index)}
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={index === shotIdx}
                >
                  <img src={mediaUrl(API_BASE_URL, entry.url)} alt={entry.alt.en ?? ''} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="product-tabs-panel" aria-label="Listing details">
          <div role="tablist" aria-label="Listing details" className="product-tabs-list">
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
          <div className="product-tabs-body">
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
                      Published at {data.location.publicPrecision} precision. Exact addresses are only shared when
                      arranged with our team.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <p style={css('margin: 0; padding: 0 28px 20px; font-size: 14px; color: #5B636B')}>
            Something wrong with this ad?{' '}
            <Link href={`/contact?ref=${encodeURIComponent(data.listingReference)}`} style={css('font-weight: 600')}>
              Report it
            </Link>
          </p>
        </section>
        </div>

        <aside className="product-sidebar" aria-label="Listing summary">
          <div className="product-sidebar-card product-sidebar-card--commerce">
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
              <p style={css('margin: 8px 0 0; font-size: 15px; font-weight: 600; color: #15191E')}>
                {data.seller.displayName}
                {data.seller.verificationBadge ? (
                  <span style={css('margin-left: 8px; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #9A6B12')}>
                    Verified
                  </span>
                ) : null}
              </p>
              <p style={css('margin: 6px 0 0; font-size: 14px; color: #5B636B')}>
                {data.location.label ?? 'Location not published'} · {postedLabel(data.publishedAt)} · Ad {data.listingReference}
              </p>
            </div>

            {isLiveAuction ? (
              <div className="live-auction-panel">
                <div>
                  <strong style={css('display: block; font-size: 15px')}>Live auction</strong>
                  <p className="mkt-hint" style={css('color: #3D3420; margin: 4px 0 0')}>
                    Times shown in Qatar (Asia/Qatar).
                  </p>
                </div>
                <div className="live-auction-stat-grid">
                  <div className="live-auction-stat">
                    <div className="live-auction-stat-label">Starting price</div>
                    <div className="live-auction-stat-value">
                      {typeof startingBidMinor === 'number' ? fmtMinor(startingBidMinor) : 'Loading…'}
                    </div>
                  </div>
                  <div className="live-auction-stat live-auction-stat--wide">
                    <div className="live-auction-stat-label">Current top bid</div>
                    <div className="live-auction-stat-value">
                      {liveTopBidLabel(startingBidMinor, currentAmountMinor, bidCount)}
                    </div>
                  </div>
                  <div className="live-auction-stat">
                    <div className="live-auction-stat-label">Starts</div>
                    <div className="live-auction-stat-value live-auction-stat-value--md">
                      {auctionStartsAt ? fmtBusinessDateTime(auctionStartsAt) : 'Loading…'}
                    </div>
                  </div>
                  <div className="live-auction-stat">
                    <div className="live-auction-stat-label">Ends</div>
                    <div className="live-auction-stat-value live-auction-stat-value--md">
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
                      {displayBids.map((bid) => (
                        <li
                          key={bid.sequence}
                          style={css('display: flex; justify-content: space-between; gap: 12px; align-items: baseline; background: rgba(255,255,255,.55); border-radius: 12px; padding: 12px 14px')}
                        >
                          <span style={css('font-weight: 600')}>{bidDisplayLabel(bid)}</span>
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
                  <Link
                    href={`/signin?returnTo=${encodeURIComponent(productReturnTo)}`}
                    className="btn-primary"
                    style={css('display: inline-flex; align-items: center; justify-content: center; height: 48px; padding: 0 22px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; box-sizing: border-box')}
                  >
                    Sign in to place a bid
                  </Link>
                ) : null}
                {bidMessage ? (
                  <p role="status" style={css('margin: 0; font-weight: 600')}>{bidMessage}</p>
                ) : null}
                {!auctionLive && unpaidWinOrder ? (
                  <Link
                    href={`/account/orders/${encodeURIComponent(unpaidWinOrder.orderReference)}`}
                    style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 18px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}
                  >
                    Checkout — pay winning bid
                  </Link>
                ) : null}
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
                {unpaidWinOrder ? (
                  <Link
                    href={`/account/orders/${encodeURIComponent(unpaidWinOrder.orderReference)}`}
                    style={css('display: inline-flex; align-items: center; height: 48px; margin-top: 12px; padding: 0 18px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}
                  >
                    Checkout — pay winning bid
                  </Link>
                ) : null}
              </div>
            ) : data.listingMethod === 'fixed_price' ? (
              <div style={css('padding: 14px 16px; border-radius: 14px; background: #F6EEDC; color: #3D3420; display: grid; gap: 12px')}>
                {data.availability === 'sold' ? (
                  <>
                    <span className="mkt-badge" style={css('justify-self: start')}>Sold</span>
                    <p className="mkt-hint" style={css('margin: 0')}>This item has been sold.</p>
                  </>
                ) : typeof data.priceMinor === 'number' ? (
                  <>
                    <div style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700")}>
                      {fmtMinor(data.priceMinor)}
                    </div>
                    {!buyOpen ? (
                      <button
                        type="button"
                        className="btn-primary"
                        style={css('justify-self: start; height: 48px; padding: 0 20px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}
                        onClick={() => {
                          if (session.status === 'anonymous') {
                            router.push(`/signin?returnTo=${encodeURIComponent(productReturnTo)}`);
                            return;
                          }
                          setBuyOpen(true);
                        }}
                      >
                        Buy now
                      </button>
                    ) : (
                      <form onSubmit={(event) => void submitBuy(event)} style={css('display: grid; gap: 12px')}>
                        <div style={css('display: grid; gap: 4px')}>
                          <p style={css('margin: 0; font-weight: 700')}>Checkout details</p>
                          <p style={css('margin: 0; font-size: 13px; color: #5B636B')}>Your name is filled from your profile. Choose a Qatar city or area, then add your address.</p>
                        </div>
                        <CheckoutDetailsFields value={buyForm} onChange={setBuyForm} idPrefix="buy" />
                        <button type="submit" disabled={buyBusy} style={css('height: 48px; padding: 0 18px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>
                          {buyBusy ? 'Creating order…' : 'Continue to payment'}
                        </button>
                        {buyError ? <p role="alert" style={css('margin: 0; color: #8B1A1A')}>{buyError}</p> : null}
                      </form>
                    )}
                  </>
                ) : (
                  <p className="mkt-hint" style={css('margin: 0')}>Price is not published for this listing yet.</p>
                )}
                {unpaidWinOrder ? (
                  <Link href={`/account/orders/${encodeURIComponent(unpaidWinOrder.orderReference)}`} style={css('font-weight: 700')}>
                    Complete your order →
                  </Link>
                ) : null}
              </div>
            ) : (
              <div style={css('padding: 14px 16px; border-radius: 14px; background: #FBFAF7; border: 1px solid #EEECE7; color: #3D3420')}>
                <p className="mkt-hint" style={css('margin: 0')}>This is an enquiry listing. Contact our team through the marketplace intake flow.</p>
              </div>
            )}

            <div style={css('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px')}>
              <div style={css('background: #FBFAF7; border: 1px solid #EEECE7; border-radius: 12px; padding: 10px 12px')}>
                <div style={css('font-size: 12px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em')}>Seller</div>
                <div style={css('font-weight: 600')}>{data.seller.displayName}</div>
              </div>
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

      {relatedListings.length > 0 && (
        <section className="product-related">
          <div style={css('display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 20px; flex-wrap: wrap')}>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; letter-spacing: -0.02em; font-weight: 700")}>Related listings</h2>
            <Link href={`/browse?category=${encodeURIComponent(categoryKey)}`} style={css('font-weight: 600')}>
              View all →
            </Link>
          </div>
          <div className="plc-grid">
            {relatedListings.map((entry) => (
              <ProductListingCard key={entry.listingReference} listing={entry} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
