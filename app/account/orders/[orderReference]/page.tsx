'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SiteFooter from '../../../../components/SiteFooter';
import SiteHeader from '../../../../components/SiteHeader';
import { apiFetch } from '../../../../lib/api';
import { css, PAGE_ROOT } from '../../../../lib/css';
import { fmtMinor } from '../../../../lib/format';
import { productPath } from '../../../../lib/listings';
import { useSession } from '../../../../lib/session';
import { useAsync } from '../../../../lib/useAsync';

type Order = {
  orderReference: string;
  lotReference: string;
  listingReference: string;
  winningPriceMinor: number;
  currency: string;
  paymentState: string;
};

export default function AccountOrderPage() {
  const params = useParams<{ orderReference: string }>();
  const orderReference = typeof params?.orderReference === 'string' ? params.orderReference : '';
  const session = useSession();
  const router = useRouter();
  const order = useAsync<{ order: Order }>(
    () => apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(orderReference)}`),
    [orderReference, session.status],
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace(`/signin?returnTo=/account/orders/${encodeURIComponent(orderReference)}`);
  }, [session.status, router, orderReference]);

  const pay = async () => {
    setMessage(null);
    try {
      const result = await apiFetch<{ message?: string; order?: Order }>('/api/payments/complete', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { orderReference },
      });
      setMessage(result.message ?? 'Payment recorded at the server total (development only — not a real card charge).');
      order.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment was not recorded');
    }
  };

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main style={css('max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; display: grid; gap: 16px')}>
        <nav style={css('font-size: 14px; color: #5B636B')}>
          <Link href="/account">Your account</Link> / Order
        </nav>
        <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif")}>{orderReference || 'Order'}</h1>
        {order.error ? <p role="alert">{order.error} <button type="button" onClick={() => order.reload()}>Retry</button></p> : null}
        {!order.data && !order.error ? <p>Loading order…</p> : null}
        {order.data ? (
          <>
            <p>Total {fmtMinor(order.data.order.winningPriceMinor)} · {order.data.order.paymentState.replaceAll('_', ' ')}</p>
            <p>
              <Link href={productPath({ listingReference: order.data.order.listingReference })} style={css('font-weight: 600')}>
                View listing · Ad {order.data.order.listingReference}
              </Link>
            </p>
            {order.data.order.paymentState === 'awaiting_payment' || order.data.order.paymentState === 'failed' ? (
              <div style={css('display: grid; gap: 8px')}>
                <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>
                  Development only: this records the server total. There is no approved live card gateway yet.
                </p>
                <button type="button" onClick={() => void pay()} style={css('justify-self: start; height: 48px; padding: 0 18px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>
                  Pay the server total
                </button>
              </div>
            ) : (
              <p role="status">This order is marked paid.</p>
            )}
            {message ? <p role="status">{message}</p> : null}
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
