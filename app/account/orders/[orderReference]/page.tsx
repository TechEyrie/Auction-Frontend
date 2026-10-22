'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import CheckoutDetailsFields, { type CheckoutDetails } from '../../../../components/CheckoutDetailsFields';
import SiteFooter from '../../../../components/SiteFooter';
import SiteHeader from '../../../../components/SiteHeader';
import { API_BASE_URL, apiFetch } from '../../../../lib/api';
import { css, PAGE_ROOT } from '../../../../lib/css';
import { fmtMinor } from '../../../../lib/format';
import { coverImage, mediaUrl, productPath, type PublicListing } from '../../../../lib/listings';
import { orderSourceLabel, paymentStateLabel } from '../../../../lib/qatarPlaces';
import { useSession } from '../../../../lib/session';
import { useAsync } from '../../../../lib/useAsync';
import '../checkout.css';

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
  const listingRef = order.data?.order.listingReference;
  const listing = useAsync<{ listing: PublicListing } | null>(
    () => {
      if (!listingRef) return Promise.resolve(null);
      return apiFetch<{ listing: PublicListing }>(`/api/listings/${encodeURIComponent(listingRef)}`, {
        headers: session.authHeaders(),
        cache: 'no-store',
      }).catch(() => null);
    },
    [listingRef, session.status],
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
      setMessage(result.message ?? 'Order confirmed for cash on delivery. Pay when the item is handed over.');
      order.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not confirm your order. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const title = order.data?.order.listingTitle?.trim() || 'Checkout';
  const sourceLabel = orderSourceLabel(order.data?.order.source);
  const needsPayment =
    order.data?.order.paymentState === 'awaiting_payment' || order.data?.order.paymentState === 'failed';
  const cover = listing.data?.listing ? coverImage(listing.data.listing) : null;
  const imageSrc = cover ? mediaUrl(API_BASE_URL, cover) : null;

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main className="checkout-page">
        <nav className="checkout-crumb" aria-label="Breadcrumb">
          <Link href="/account">Your account</Link>
          <span aria-hidden="true">/</span>
          <span>Checkout</span>
        </nav>

        {order.error ? (
          <p role="alert" className="checkout-alert">
            {order.error}{' '}
            <button type="button" onClick={() => order.reload()} className="adm-link-btn" style={css('font: inherit; font-weight: 600; cursor: pointer; border: 0; background: transparent; color: var(--mkt-gold)')}>
              Retry
            </button>
          </p>
        ) : null}

        {!order.data && !order.error ? <p className="checkout-state">Loading your checkout…</p> : null}

        {order.data ? (
          <>
            <header className="checkout-hero">
              <div>
                <p className="checkout-hero__kicker">{sourceLabel}</p>
                <h1>{title}</h1>
                <p>
                  {needsPayment
                    ? 'Enter your delivery details. You pay in cash when the item is handed over — no card is charged now.'
                    : 'This order is confirmed for cash on delivery. Pay when you receive the item.'}
                </p>
              </div>
              <span className="checkout-hero__badge">{needsPayment ? 'Pay on delivery' : 'COD confirmed'}</span>
            </header>

            <div className="checkout-layout">
              <section className="checkout-panel">
                <div>
                  <p className="checkout-status">
                    {paymentStateLabel(order.data.order.paymentState)}
                    {' · '}
                    <Link href={productPath({ listingReference: order.data.order.listingReference })}>View listing</Link>
                  </p>
                </div>

                {needsPayment ? (
                  <form onSubmit={(event) => void pay(event)} style={css('display: grid; gap: 18px')}>
                    <div>
                      <h2 className="checkout-panel__title">Delivery details</h2>
                      <p className="checkout-panel__lede">
                        Name, phone, city and address so our team can arrange handover in Qatar.
                      </p>
                    </div>
                    <CheckoutDetailsFields value={fulfillment} onChange={setFulfillment} idPrefix="order" />
                    <div className="checkout-note">
                      Submitting confirms your order for cash on delivery. You will pay the total when you receive the item.
                    </div>
                    <button type="submit" disabled={busy} className="btn-primary checkout-submit">
                      {busy ? 'Confirming…' : `Confirm order · ${fmtMinor(order.data.order.winningPriceMinor)} due on delivery`}
                    </button>
                  </form>
                ) : (
                  <div className="checkout-success">
                    <div className="checkout-success__icon" aria-hidden="true">✓</div>
                    <h2>Order confirmed for cash on delivery</h2>
                    <p>
                      Thank you. Pay the total when the item is handed over. The listing is marked sold. You can find this order under Your purchases.
                    </p>
                    {order.data.order.fulfillment ? (
                      <p className="checkout-success__meta">
                        {order.data.order.fulfillment.fullName} · {order.data.order.fulfillment.city}
                        {order.data.order.fulfillment.address ? ` · ${order.data.order.fulfillment.address}` : ''}
                      </p>
                    ) : null}
                    <Link href="/account" className="btn-primary checkout-submit" style={css('display: inline-flex; align-items: center; justify-content: center; width: auto; padding: 0 22px')}>
                      Back to account
                    </Link>
                  </div>
                )}

                {message ? (
                  <p role="status" className="checkout-flash">
                    {message}
                  </p>
                ) : null}
              </section>

              <aside>
                <div className="checkout-summary">
                  <h2>Order summary</h2>
                  <div className="checkout-product">
                    <div className="checkout-product__media">
                      {imageSrc ? <img src={imageSrc} alt="" /> : null}
                    </div>
                    <div>
                      <p className="checkout-product__title">{title}</p>
                      <p className="checkout-product__type">{sourceLabel}</p>
                    </div>
                  </div>
                  <div className="checkout-row">
                    <span>Payment</span>
                    <strong>Cash on delivery</strong>
                  </div>
                  <div className="checkout-rule" />
                  <div className="checkout-total">
                    <span>Total due</span>
                    <strong>{fmtMinor(order.data.order.winningPriceMinor)}</strong>
                  </div>
                </div>
                <p className="checkout-aside-note" style={css('margin-top: 14px')}>
                  Inspect before you settle in person. Our team helps arrange handover — contact details are never published on the listing.
                </p>
              </aside>
            </div>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
