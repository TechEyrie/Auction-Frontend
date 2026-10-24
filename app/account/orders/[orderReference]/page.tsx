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
import { useChromeTranslate } from '../../../../lib/siteChrome';
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
  const at = useChromeTranslate('account');
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
      setMessage(result.message ?? at('account.checkout.confirmSuccess'));
      order.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : at('account.checkout.confirmError'));
    } finally {
      setBusy(false);
    }
  };

  const title = order.data?.order.listingTitle?.trim() || at('account.checkout.defaultTitle');
  const sourceLabel = orderSourceLabel(order.data?.order.source, at);
  const needsPayment =
    order.data?.order.paymentState === 'awaiting_payment' || order.data?.order.paymentState === 'failed';
  const cover = listing.data?.listing ? coverImage(listing.data.listing) : null;
  const imageSrc = cover ? mediaUrl(API_BASE_URL, cover) : null;

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main className="checkout-page">
        <nav className="checkout-crumb" aria-label="Breadcrumb">
          <Link href="/account">{at('account.h1')}</Link>
          <span aria-hidden="true">/</span>
          <span>{at('account.checkout.breadcrumb')}</span>
        </nav>

        {order.error ? (
          <p role="alert" className="checkout-alert">
            {order.error}{' '}
            <button type="button" onClick={() => order.reload()} className="adm-link-btn" style={css('font: inherit; font-weight: 600; cursor: pointer; border: 0; background: transparent; color: var(--mkt-gold)')}>
              {at('account.retry')}
            </button>
          </p>
        ) : null}

        {!order.data && !order.error ? <p className="checkout-state">{at('account.checkout.loading')}</p> : null}

        {order.data ? (
          <>
            <header className="checkout-hero">
              <div>
                <p className="checkout-hero__kicker">{sourceLabel}</p>
                <h1>{title}</h1>
                <p>
                  {needsPayment ? at('account.checkout.heroNeedsPayment') : at('account.checkout.heroConfirmed')}
                </p>
              </div>
              <span className="checkout-hero__badge">
                {needsPayment ? at('account.checkout.badgePayOnDelivery') : at('account.checkout.badgeCodConfirmed')}
              </span>
            </header>

            <div className="checkout-layout">
              <section className="checkout-panel">
                <div>
                  <p className="checkout-status">
                    {paymentStateLabel(order.data.order.paymentState, at)}
                    {' · '}
                    <Link href={productPath({ listingReference: order.data.order.listingReference })}>
                      {at('account.checkout.viewListing')}
                    </Link>
                  </p>
                </div>

                {needsPayment ? (
                  <form onSubmit={(event) => void pay(event)} style={css('display: grid; gap: 18px')}>
                    <div>
                      <h2 className="checkout-panel__title">{at('account.checkout.deliveryTitle')}</h2>
                      <p className="checkout-panel__lede">{at('account.checkout.deliveryLead')}</p>
                    </div>
                    <CheckoutDetailsFields value={fulfillment} onChange={setFulfillment} idPrefix="order" />
                    <div className="checkout-note">{at('account.checkout.submitNote')}</div>
                    <button type="submit" disabled={busy} className="btn-primary checkout-submit">
                      {busy
                        ? at('account.checkout.confirmBusy')
                        : at('account.checkout.confirmButton', {
                            amount: fmtMinor(order.data.order.winningPriceMinor),
                          })}
                    </button>
                  </form>
                ) : (
                  <div className="checkout-success">
                    <div className="checkout-success__icon" aria-hidden="true">✓</div>
                    <h2>{at('account.checkout.successTitle')}</h2>
                    <p>{at('account.checkout.successBody')}</p>
                    {order.data.order.fulfillment ? (
                      <p className="checkout-success__meta">
                        {order.data.order.fulfillment.fullName} · {order.data.order.fulfillment.city}
                        {order.data.order.fulfillment.address ? ` · ${order.data.order.fulfillment.address}` : ''}
                      </p>
                    ) : null}
                    <Link href="/account" className="btn-primary checkout-submit" style={css('display: inline-flex; align-items: center; justify-content: center; width: auto; padding: 0 22px')}>
                      {at('account.checkout.backToAccount')}
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
                  <h2>{at('account.checkout.orderSummary')}</h2>
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
                    <span>{at('account.checkout.paymentLabel')}</span>
                    <strong>{at('account.checkout.paymentCod')}</strong>
                  </div>
                  <div className="checkout-rule" />
                  <div className="checkout-total">
                    <span>{at('account.checkout.totalDue')}</span>
                    <strong>{fmtMinor(order.data.order.winningPriceMinor)}</strong>
                  </div>
                </div>
                <p className="checkout-aside-note" style={css('margin-top: 14px')}>
                  {at('account.checkout.asideNote')}
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
