'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';
import { apiFetch } from '../../../lib/api';
import { css, PAGE_ROOT } from '../../../lib/css';
import { productPath } from '../../../lib/listings';
import { useAsync } from '../../../lib/useAsync';
import '../lot.css';

type AuctionState = {
  listingReference: string;
};

/** Legacy `/lot/:id` URLs redirect to the product page; show neutral copy while resolving. */
export default function LotRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const auction = useAsync<{ auction: AuctionState }>(
    () => apiFetch<{ auction: AuctionState }>(`/api/auctions/${encodeURIComponent(id)}`, { cache: 'no-store' }),
    [id],
  );

  const listingReference = auction.data?.auction?.listingReference;

  useEffect(() => {
    if (!listingReference) return;
    router.replace(productPath({ listingReference }));
  }, [listingReference, router]);

  const resolving = auction.loading || Boolean(listingReference);

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Opening product — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="auctions" navCurrent={false} />
      <main style={css('max-width: 640px; margin: 0 auto; padding: 64px 24px 80px; display: grid; gap: 12px')}>
        {resolving ? (
          <p role="status" style={css('margin: 0; font-size: 18px; font-weight: 600')}>Opening product…</p>
        ) : (
          <>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 1.75rem; font-weight: 700")}>
              This auction is not open
            </h1>
            <p style={css('margin: 0; color: #5B636B')}>
              Bidding happens on the product page when staff have opened a live auction for a listing.
            </p>
            <div style={css('display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px')}>
              <Link href="/auctions" className="btn-primary" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}>
                Live auctions
              </Link>
              <Link href="/browse" style={css('display: inline-flex; align-items: center; height: 48px; padding: 0 20px; border: 1px solid #DAD7D0; border-radius: 12px; font-weight: 600')}>
                Browse listings
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
