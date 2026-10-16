'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import CheckoutDetailsFields, { type CheckoutDetails } from '../../../../components/CheckoutDetailsFields';
import SiteFooter from '../../../../components/SiteFooter';
import SiteHeader from '../../../../components/SiteHeader';
import { apiFetch } from '../../../../lib/api';
import { css, PAGE_ROOT } from '../../../../lib/css';
import { fmtMinor } from '../../../../lib/format';
import { productPath } from '../../../../lib/listings';
import { orderSourceLabel, paymentStateLabel } from '../../../../lib/qatarPlaces';
import { useSession } from '../../../../lib/session';
import { useAsync } from '../../../../lib/useAsync';

type Order = {
  orderReference: string;
  source?: string;
  lotReference: string | null;
  listingReference: string;
  listingTitle?: string;
  winningPriceMinor: number;
  currency: string;
  paymentState: string;
  fulfillment?: CheckoutDetails | null;
};

const emptyFulfillment = (): CheckoutDetails => ({ fullName: '', phone: '', city: '', address: '' });

export default function AccountOrderPage() {
  const params = useParams<{ orderReference: string }>();
  const orderReference = typeof params?.orderReference === 'string' ? params.orderReference : '';
  const session = useSession();
  const router = useRouter();
  const order = useAsync<{ order: Order }>(
    () => apiFetch<{ order: Order }>(`/api/orders/${encodeURIComponent(orderReference)}`, { headers: session.authHeaders() }),
    [orderReference, session.status],
  );
  const [fulfillment, setFulfillment] = useState<CheckoutDetails>(emptyFulfillment());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace(`/signin?returnTo=/account/orders/${encodeURIComponent(orderReference)}`);
  }, [session.status, router, orderReference]);

  useEffect(() => {
    if (order.data?.order.fulfillment) {
      setFulfillment(order.data.order.fulfillment);
      setPrefilled(true);
      return;
    }
    if (prefilled || session.status !== 'authenticated' || !session.user) return;
    setFulfillment((prev) => ({
      ...prev,
      fullName: prev.fullName || session.user!.fullName || '',
      phone: prev.phone || session.user!.phone || '',
    }));
    setPrefilled(true);
  }, [order.data?.order.fulfillment, prefilled, session.status, session.user]);

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
      await saveFulfillment();
      const result = await apiFetch<{ message?: string; order?: Order }>('/api/payments/complete', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { orderReference },
      });
      setMessage(result.message ?? 'Payment recorded. This item is yours.');
      order.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Payment was not recorded');
    } finally {
      setBusy(false);
    }
  };

  const title = order.data?.order.listingTitle?.trim() || 'Checkout';
  const sourceLabel = orderSourceLabel(order.data?.order.source);
  const needsPayment =
    order.data?.order.paymentState === 'awaiting_payment' || order.data?.order.paymentState === 'failed';

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main style={css('max-width: 960px; margin: 0 auto; padding: 28px 24px 72px')}>
        <nav style={css('font-size: 14px; color: #5B636B; margin-bottom: 18px')}>
          <Link href="/account">Your account</Link>
          <span style={css('margin: 0 6px')}>/</span>
          <span>Checkout</span>
        </nav>

        {order.error ? (
          <p role="alert" style={css('padding: 16px; border-radius: 14px; background: #FDF6F4; border: 1px solid #E7C9C2; color: #8A2C11')}>
            {order.error}{' '}
            <button type="button" onClick={() => order.reload()} style={css('font: inherit; font-weight: 600; cursor: pointer; border: 0; background: transparent; color: #9A6B12')}>
              Retry
            </button>
          </p>
        ) : null}

        {!order.data && !order.error ? (
          <p style={css('color: #5B636B')}>Loading your checkout…</p>
        ) : null}

        {order.data ? (
          <div style={css('display: grid; gap: 22px; grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr)')} className="checkout-layout">
            <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 22px; padding: 28px 26px; display: grid; gap: 18px; min-width: 0')}>
              <div style={css('display: grid; gap: 8px')}>
                <p style={css('margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #9A6B12')}>
                  {sourceLabel}
                </p>
                <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(26px, 3vw, 34px); line-height: 1.15")}>
                  {title}
                </h1>
                <p style={css('margin: 0; color: #5B636B')}>
                  {paymentStateLabel(order.data.order.paymentState)}
                  {' · '}
                  <Link href={productPath({ listingReference: order.data.order.listingReference })} style={css('font-weight: 600')}>
                    View listing
                  </Link>
                </p>
              </div>

              {needsPayment ? (
                <form onSubmit={(event) => void pay(event)} style={css('display: grid; gap: 18px')}>
                  <div style={css('display: grid; gap: 6px')}>
                    <h2 style={css('margin: 0; font-size: 18px')}>Delivery details</h2>
                    <p style={css('margin: 0; color: #5B636B; font-size: 14px')}>
                      Where should our team arrange pickup or handover for this item?
                    </p>
                  </div>
                  <CheckoutDetailsFields value={fulfillment} onChange={setFulfillment} idPrefix="order" />
                  <div style={css('padding: 14px 16px; border-radius: 14px; background: #F6EEDC; color: #3D3420; font-size: 14px')}>
                    Confirm and pay records this purchase against the server total. No live card gateway is connected yet.
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-primary"
                    style={css('justify-self: start; height: 52px; padding: 0 22px; border: 0; border-radius: 14px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}
                  >
                    {busy ? 'Processing…' : `Confirm and pay · ${fmtMinor(order.data.order.winningPriceMinor)}`}
                  </button>
                </form>
              ) : (
                <div style={css('padding: 18px; border-radius: 16px; background: #F2F8F2; border: 1px solid #CBE0CB; display: grid; gap: 8px')}>
                  <p style={css('margin: 0; font-weight: 700; color: #1F5B2B')}>This purchase is paid</p>
                  <p style={css('margin: 0; color: #3D3420')}>
                    Thank you. The listing is marked sold. You can find it again under Your purchases on your account.
                  </p>
                  {order.data.order.fulfillment ? (
                    <p style={css('margin: 8px 0 0; color: #5B636B; font-size: 14px')}>
                      {order.data.order.fulfillment.fullName} · {order.data.order.fulfillment.city}
                      {order.data.order.fulfillment.address ? ` · ${order.data.order.fulfillment.address}` : ''}
                    </p>
                  ) : null}
                </div>
              )}

              {message ? (
                <p role="status" style={css('margin: 0; padding: 12px 14px; border-radius: 12px; background: #FBFAF7; border: 1px solid #E6E4DF')}>
                  {message}
                </p>
              ) : null}
            </section>

            <aside style={css('display: grid; gap: 14px; align-content: start; min-width: 0')}>
              <div style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 22px; padding: 22px; display: grid; gap: 14px')}>
                <h2 style={css('margin: 0; font-size: 16px; letter-spacing: .04em; text-transform: uppercase; color: #5B636B')}>
                  Order summary
                </h2>
                <div style={css('display: flex; justify-content: space-between; gap: 12px; align-items: baseline')}>
                  <span style={css('color: #5B636B')}>Item</span>
                  <strong style={css('text-align: right')}>{title}</strong>
                </div>
                <div style={css('display: flex; justify-content: space-between; gap: 12px')}>
                  <span style={css('color: #5B636B')}>Type</span>
                  <strong>{sourceLabel}</strong>
                </div>
                <div style={css('height: 1px; background: #E6E4DF')} />
                <div style={css('display: flex; justify-content: space-between; gap: 12px; align-items: baseline')}>
                  <span style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 18px; font-weight: 700")}>Total</span>
                  <span style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #9A6B12")}>
                    {fmtMinor(order.data.order.winningPriceMinor)}
                  </span>
                </div>
              </div>
              <div style={css('padding: 16px 18px; border-radius: 18px; background: #FBFAF7; border: 1px solid #EEECE7; color: #5B636B; font-size: 14px')}>
                Inspect before you settle in person. Our team helps arrange handover — contact details are never published on the listing.
              </div>
            </aside>
          </div>
        ) : null}
      </main>
      <style>{`
        @media (max-width: 820px) {
          .checkout-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <SiteFooter />
    </div>
  );
}
