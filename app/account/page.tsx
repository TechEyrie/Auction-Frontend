'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { fmtMinor } from '../../lib/format';
import { productPath } from '../../lib/listings';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

type Account = {
  profile: { fullName: string; email: string | null; phone: string | null; termsVersion: string | null; publicReference: string };
  bids: { lotReference: string; amountMinor: number; sequence: number; acceptedAt: string }[];
  orders: {
    orderReference: string;
    lotReference: string;
    listingReference: string;
    winningPriceMinor: number;
    paymentState: string;
    currency: string;
    createdAt: string;
  }[];
};

export default function AccountPage() {
  const session = useSession();
  const router = useRouter();
  const account = useAsync<Account>(
    () => {
      if (session.status !== 'authenticated' || !session.user) {
        return Promise.reject(new Error('Sign in to see your account'));
      }
      return apiFetch<Account>('/api/account');
    },
    [session.status, session.user?.publicReference],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [bidListingByAuctionId, setBidListingByAuctionId] = useState<Record<string, string>>({});
  const terms = useAsync<{ version: number; body: string }>(() => apiFetch('/api/content/terms'), []);

  useEffect(() => {
    const bids = account.data?.bids ?? [];
    if (bids.length === 0) {
      setBidListingByAuctionId({});
      return;
    }
    const auctionIds = [...new Set(bids.map((bid) => bid.lotReference))];
    void Promise.all(
      auctionIds.map(async (auctionId) => {
        try {
          const result = await apiFetch<{ auction: { listingReference: string } }>(
            `/api/auctions/${encodeURIComponent(auctionId)}`,
            { cache: 'no-store' },
          );
          return [auctionId, result.auction.listingReference] as const;
        } catch {
          return [auctionId, null] as const;
        }
      }),
    ).then((pairs) => {
      const next: Record<string, string> = {};
      for (const [auctionId, listingReference] of pairs) {
        if (listingReference) next[auctionId] = listingReference;
      }
      setBidListingByAuctionId(next);
    });
  }, [account.data?.bids]);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace('/signin?returnTo=/account');
  }, [session.status, router]);

  const accept = async (version: number) => {
    setNotice(null);
    try {
      const result = await apiFetch<{ termsVersion: string }>('/api/account/terms', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { version },
      });
      setNotice(`Accepted terms version ${result.termsVersion}`);
      account.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not record acceptance');
    }
  };

  const signOut = async () => {
    await session.logout();
    router.push('/');
  };

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main style={css('max-width: 880px; margin: 0 auto; padding: 32px 24px 64px; display: grid; gap: 20px')}>
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center')}>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif")}>Your account</h1>
          {session.user ? (
            <button type="button" onClick={() => void signOut()} style={css('height: 42px; padding: 0 16px; border: 1px solid #DAD7D0; border-radius: 10px; background: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
              Sign out
            </button>
          ) : null}
        </div>

        {session.status === 'loading' || (!account.data && !account.error) ? <p>Loading your profile, bids and orders…</p> : null}
        {account.error ? (
          <p role="alert">
            {account.error}{' '}
            <button type="button" onClick={() => account.reload()}>Retry</button>
            {' · '}
            <Link href="/signin?returnTo=/account">Sign in</Link>
          </p>
        ) : null}

        {account.data ? (
          <>
            <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 18px 20px; display: grid; gap: 8px')}>
              <h2 style={css('margin: 0; font-size: 18px')}>Profile</h2>
              <p style={css('margin: 0')}>{account.data.profile.fullName}</p>
              <p style={css('margin: 0; color: #5B636B')}>{account.data.profile.email ?? 'No email on file'} · {account.data.profile.phone ?? 'No phone on file'}</p>
              <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>Account id {account.data.profile.publicReference}</p>
              <p style={css('margin: 0')}>Accepted terms version: {account.data.profile.termsVersion ?? 'none yet'}</p>
              {terms.data ? (
                <button type="button" onClick={() => void accept(terms.data!.version)} style={css('justify-self: start; height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                  Accept published terms version {terms.data.version}
                </button>
              ) : (
                <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>No published terms document yet.</p>
              )}
              {notice ? <p role="status">{notice}</p> : null}
            </section>

            <section style={css('display: grid; gap: 10px')}>
              <h2 style={css('margin: 0')}>Your bids</h2>
              {account.data.bids.length === 0 ? (
                <p>No bids yet. <Link href="/auctions">See auction listings</Link></p>
              ) : (
                <ul style={css('list-style: none; margin: 0; padding: 0; display: grid; gap: 8px')}>
                  {account.data.bids.map((bid) => {
                    const listingReference = bidListingByAuctionId[bid.lotReference];
                    const bidHref = listingReference ? productPath({ listingReference }) : '/auctions';
                    const bidLabel = listingReference ? `Ad ${listingReference}` : 'Live auction';
                    return (
                    <li key={`${bid.lotReference}-${bid.sequence}`} style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 12px; padding: 12px 14px')}>
                      <Link href={bidHref} style={css('font-weight: 700')}>{bidLabel}</Link>
                      {' · '}{fmtMinor(bid.amountMinor)}{' · '}bid #{bid.sequence}
                      <div style={css('color: #5B636B; font-size: 13px; margin-top: 4px')}>{new Date(bid.acceptedAt).toLocaleString()}</div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section style={css('display: grid; gap: 10px')}>
              <h2 style={css('margin: 0')}>Wins and payments</h2>
              <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>
                Fixed-price “buy now” is not available. Wins only appear here after you win a live auction.
              </p>
              {account.data.orders.length === 0 ? (
                <p>No winning orders yet.</p>
              ) : (
                <ul style={css('list-style: none; margin: 0; padding: 0; display: grid; gap: 8px')}>
                  {account.data.orders.map((order) => (
                    <li key={order.orderReference} style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 12px; padding: 12px 14px; display: grid; gap: 6px')}>
                      <div>
                        <Link href={`/account/orders/${encodeURIComponent(order.orderReference)}`} style={css('font-weight: 700')}>{order.orderReference}</Link>
                        {' · '}{fmtMinor(order.winningPriceMinor)}{' · '}{order.paymentState.replaceAll('_', ' ')}
                      </div>
                      <div style={css('font-size: 14px')}>
                        <Link href={productPath({ listingReference: order.listingReference })} style={css('font-weight: 600')}>
                          Winning auction · Ad {order.listingReference}
                        </Link>
                      </div>
                      <div style={css('color: #5B636B; font-size: 13px')}>{new Date(order.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
