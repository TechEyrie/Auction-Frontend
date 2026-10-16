'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import SiteFooter from '../../../../components/SiteFooter';
import SiteHeader from '../../../../components/SiteHeader';
import { apiFetch } from '../../../../lib/api';
import { css, PAGE_ROOT } from '../../../../lib/css';
import { fmtMinor } from '../../../../lib/format';
import { productPath } from '../../../../lib/listings';
import { useSession } from '../../../../lib/session';
import { useAsync } from '../../../../lib/useAsync';

type Fulfillment = { fullName: string; phone: string; city: string; address: string };

type Order = {
  orderReference: string;
  source?: string;
  lotReference: string | null;
  listingReference: string;
  winningPriceMinor: number;
  currency: string;
  paymentState: string;
  fulfillment?: Fulfillment | null;
};

const emptyFulfillment = (): Fulfillment => ({ fullName: '', phone: '', city: '', address: '' });

export default function AccountOrderPage() {
  const params = useParams<{ orderReference: string }>();
  const orderReference = typeof params?.orderReference === 'string' ? params.orderReference : '';
  const session = useSession();
  const router = useRouter();
  const order = useAsync<{ order: Order }>(
    () => apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(orderReference)}`, { headers: session.authHeaders() }),
    [orderReference, session.status],
  );
  const [fulfillment, setFulfillment] = useState<Fulfillment>(emptyFulfillment());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace(`/signin?returnTo=/account/orders/${encodeURIComponent(orderReference)}`);
  }, [session.status, router, orderReference]);

  useEffect(() => {
    if (order.data?.order.fulfillment) setFulfillment(order.data.order.fulfillment);
  }, [order.data?.order.fulfillment]);

  const saveFulfillment = async () => {
    await apiFetch(`/api/orders/${encodeURIComponent(orderReference)}/fulfillment`, {
      method: 'PATCH',
      headers: session.authHeaders(),
      json: fulfillment,
    });
  };

  const pay = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      if (!order.data?.order.fulfillment) await saveFulfillment();
      const result = await apiFetch<{ message?: string; order?: Order }>('/api/payments/complete', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { orderReference },
      });
      setMessage(result.message ?? 'Payment recorded. This product is yours (development placeholder — no real card charge).');
      order.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment was not recorded');
    } finally {
      setBusy(false);
    }
  };

  const sourceLabel = order.data?.order.source === 'fixed_price' ? 'Fixed price' : 'Auction win';

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
            <p>{sourceLabel} · Total {fmtMinor(order.data.order.winningPriceMinor)} · {order.data.order.paymentState.replaceAll('_', ' ')}</p>
            <p>
              <Link href={productPath({ listingReference: order.data.order.listingReference })} style={css('font-weight: 600')}>
                View listing · Ad {order.data.order.listingReference}
              </Link>
            </p>
            {order.data.order.paymentState === 'awaiting_payment' || order.data.order.paymentState === 'failed' ? (
              <form onSubmit={(event) => void pay(event)} style={css('display: grid; gap: 12px; padding: 16px; border: 1px solid #E6E4DF; border-radius: 16px')}>
                <p style={css('margin: 0; font-weight: 700')}>Delivery / pickup details</p>
                {(['fullName', 'phone', 'city', 'address'] as const).map((field) => (
                  <label key={field} style={css('display: grid; gap: 4px; font-size: 14px')}>
                    <span>{field === 'fullName' ? 'Full name' : field.charAt(0).toUpperCase() + field.slice(1)}</span>
                    <input
                      className="field"
                      required
                      value={fulfillment[field]}
                      onChange={(event) => setFulfillment({ ...fulfillment, [field]: event.target.value })}
                    />
                  </label>
                ))}
                <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>
                  Development only: Confirm and pay records the server total. There is no approved live card gateway yet.
                </p>
                <button type="submit" disabled={busy} style={css('justify-self: start; height: 48px; padding: 0 18px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>
                  {busy ? 'Processing…' : 'Confirm and pay'}
                </button>
              </form>
            ) : (
              <p role="status">This order is paid. Thank you — the listing is marked sold.</p>
            )}
            {message ? <p role="status">{message}</p> : null}
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
