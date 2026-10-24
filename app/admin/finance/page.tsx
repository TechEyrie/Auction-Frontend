'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../../lib/api';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { fmtBusinessDateTime, fmtMinor } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { localizedText } from '../../../lib/listings';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import type { MessageKey } from '../../../lib/uiMessages';
import { Badge, GhostButton, Label, PageHeader, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type Summary = {
  definitions: { collectedRevenueMinor: string };
  collectedRevenueMinor: number;
  unpaidWins: number;
  awaitingPaymentCount?: number;
  orderCount: number;
};

type Row = {
  orderReference: string;
  source?: string;
  sourceLabel: string;
  listingTitle: string;
  title?: { en: string | null; ar: string | null };
  listingReference: string;
  lotReference?: string | null;
  buyer?: {
    userReference: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
  };
  fulfillment?: {
    fullName: string;
    phone: string;
    city: string;
    address: string;
  } | null;
  paymentState: string;
  paymentLabel: string;
  amountPaidMinor: number;
  winningPriceMinor: number;
  createdAt: string;
  paidAt: string | null;
};

type FinanceFilters = {
  q: string;
  paymentState: string;
  source: string;
  buyer: string;
};

function initialFinanceFilters(): FinanceFilters {
  if (typeof window === 'undefined') {
    return { q: '', paymentState: '', source: '', buyer: '' };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') ?? '',
    paymentState: params.get('paymentState') ?? '',
    source: params.get('source') ?? '',
    buyer: params.get('buyer') ?? '',
  };
}

function financeQueryString(filters: FinanceFilters): string {
  const params = new URLSearchParams({ page: '1', limit: '50' });
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.paymentState) params.set('paymentState', filters.paymentState);
  if (filters.source) params.set('source', filters.source);
  if (filters.buyer.trim()) params.set('buyer', filters.buyer.trim());
  return params.toString();
}

function financeSharePath(filters: FinanceFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.paymentState) params.set('paymentState', filters.paymentState);
  if (filters.source) params.set('source', filters.source);
  if (filters.buyer.trim()) params.set('buyer', filters.buyer.trim());
  const qs = params.toString();
  return qs ? `/admin/finance?${qs}` : '/admin/finance';
}

function financeSourceLabel(source: string | undefined, t: (key: MessageKey) => string): string {
  if (source === 'fixed_price') return t('admin.finance.buyNow');
  if (source === 'auction') return t('admin.finance.auctionWin');
  return t('admin.finance.orderType');
}

function financePaymentLabel(paymentState: string, t: (key: MessageKey) => string): string {
  if (paymentState === 'paid') return t('admin.finance.paid');
  if (paymentState === 'awaiting_payment') return t('admin.finance.awaitingPaymentOption');
  if (paymentState === 'failed') return t('admin.finance.failed');
  return paymentState;
}

export default function AdminFinancePage() {
  const { t, lang } = useUiLocale();
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => initialFinanceFilters().q);
  const [paymentState, setPaymentState] = useState(() => initialFinanceFilters().paymentState);
  const [source, setSource] = useState(() => initialFinanceFilters().source);
  const [buyer, setBuyer] = useState(() => initialFinanceFilters().buyer);

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setPaymentState(searchParams.get('paymentState') ?? '');
    setSource(searchParams.get('source') ?? '');
    setBuyer(searchParams.get('buyer') ?? '');
  }, [searchParams]);
  const [exportBusy, setExportBusy] = useState(false);
  const filters: FinanceFilters = { q, paymentState, source, buyer };
  const summary = useAsync<Summary>(() => apiFetch<Summary>('/api/admin/finance/summary'), []);
  const orders = useAsync<{ orders: Row[]; total: number }>(
    () => apiFetch(`/api/admin/finance/orders?${financeQueryString(filters)}`),
    [q, paymentState, source, buyer],
  );

  const awaiting = summary.data?.awaitingPaymentCount ?? summary.data?.unpaidWins;

  async function exportCsv(): Promise<void> {
    setExportBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/finance/export`, {
        credentials: 'include',
        headers: session.authHeaders(),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'platform-orders.csv';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportBusy(false);
    }
  }

  function syncUrlFromFilters(): void {
    router.replace(financeSharePath(filters), { scroll: false });
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title={t('admin.finance.title')}
        subtitle={t('admin.finance.subtitle')}
        actions={
          <GhostButton type="button" disabled={exportBusy} onClick={() => void exportCsv()}>
            {exportBusy ? t('admin.finance.exporting') : t('admin.finance.export')}
          </GhostButton>
        }
      />

      <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px')}>
        <Panel title={t('admin.finance.collectedRevenue')}>
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #9A6B12")}>
            {summary.data != null ? fmtMinor(summary.data.collectedRevenueMinor, lang) : '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            {t('admin.finance.collectedHint')}
          </p>
        </Panel>
        <Panel title={t('admin.finance.awaitingPayment')}>
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700")}>
            {awaiting ?? '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            {t('admin.finance.awaitingHint')}
          </p>
        </Panel>
        <Panel title={t('admin.finance.allOrders')}>
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700")}>
            {summary.data?.orderCount ?? '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            {t('admin.finance.allOrdersHint')}
          </p>
        </Panel>
      </div>

      <Panel
        title={t('admin.finance.orders')}
        actions={
          <GhostButton onClick={() => { orders.reload(); summary.reload(); }} disabled={orders.loading}>
            {t('admin.common.reload')}
          </GhostButton>
        }
      >
        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            syncUrlFromFilters();
            orders.reload();
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="fin-q">{t('admin.field.search')}</Label>
            <input
              id="fin-q"
              className="field"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t('admin.finance.searchPlaceholder')}
            />
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-buyer">{t('admin.field.buyer')}</Label>
            <input
              id="fin-buyer"
              className="field"
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              placeholder={t('admin.finance.buyerPlaceholder')}
            />
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-pay">{t('admin.field.payment')}</Label>
            <select id="fin-pay" className="field" value={paymentState} onChange={(event) => setPaymentState(event.target.value)}>
              <option value="">{t('admin.common.any')}</option>
              <option value="paid">{t('admin.finance.paid')}</option>
              <option value="awaiting_payment">{t('admin.finance.awaitingPaymentOption')}</option>
              <option value="failed">{t('admin.finance.failed')}</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-source">{t('admin.field.source')}</Label>
            <select id="fin-source" className="field" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">{t('admin.common.any')}</option>
              <option value="auction">{t('admin.finance.sourceAuction')}</option>
              <option value="fixed_price">{t('admin.finance.sourceFixedPrice')}</option>
            </select>
          </div>
          <div className="adm-actions">
            <PrimaryButton>{t('admin.common.filter')}</PrimaryButton>
          </div>
        </form>

        <StateBlock
          loading={orders.loading}
          error={orders.error}
          empty={(orders.data?.orders ?? []).length === 0}
          emptyText={t('admin.finance.empty')}
          onRetry={orders.reload}
        >
          <TableWrap label={t('admin.finance.tableCaption')}>
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">{t('admin.finance.colProduct')}</th>
                  <th scope="col">{t('admin.finance.colBuyer')}</th>
                  <th scope="col">{t('admin.finance.colType')}</th>
                  <th scope="col">{t('admin.finance.colPayment')}</th>
                  <th scope="col">{t('admin.finance.colAmountPaid')}</th>
                  <th scope="col">{t('admin.finance.colCreated')}</th>
                  <th scope="col">{t('admin.finance.colPaidAt')}</th>
                  <th scope="col">{t('admin.finance.colDelivery')}</th>
                </tr>
              </thead>
              <tbody>
                {(orders.data?.orders ?? []).map((order) => (
                  <tr key={order.orderReference}>
                    <td className="wrap">
                      <span style={css('font-weight: 600')}>
                        {localizedText(
                          order.title ?? { en: order.listingTitle, ar: null },
                          lang,
                          order.listingTitle,
                        )}
                      </span>
                      <div className="adm-hint">{order.orderReference}</div>
                      <div className="adm-hint">
                        {order.listingReference}
                        {order.lotReference ? ` · ${order.lotReference}` : ''}
                      </div>
                      <div style={css('display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; font-size: 13px')}>
                        <Link href={`/product/${order.listingReference}`} style={css('font-weight: 600')}>
                          {t('admin.finance.linkProduct')}
                        </Link>
                        <Link href={`/admin/listings/${order.listingReference}`} style={css('font-weight: 600')}>
                          {t('admin.finance.linkListingAdmin')}
                        </Link>
                        {order.lotReference && (
                          <Link href={`/lot/${order.lotReference}`} style={css('font-weight: 600')}>
                            {t('admin.finance.linkLot')}
                          </Link>
                        )}
                        <Link
                          href={`/admin/auctions?listing=${encodeURIComponent(order.listingReference)}`}
                          style={css('font-weight: 600')}
                        >
                          {t('admin.finance.linkAuctions')}
                        </Link>
                      </div>
                    </td>
                    <td className="wrap">
                      <span style={css('font-weight: 600')}>
                        {order.buyer?.fullName ?? order.buyer?.userReference ?? '—'}
                      </span>
                      {order.buyer?.userReference && (
                        <div>
                          <Link
                            href={`/admin/finance?buyer=${encodeURIComponent(order.buyer.userReference)}`}
                            className="adm-hint"
                            style={css('font-weight: 600')}
                          >
                            {order.buyer.userReference}
                          </Link>
                        </div>
                      )}
                      {(order.buyer?.phone || order.buyer?.email) && (
                        <div className="adm-hint">
                          {[order.buyer.phone, order.buyer.email].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>{financeSourceLabel(order.source, t)}</td>
                    <td>
                      <Badge tone={order.paymentState === 'paid' ? 'good' : order.paymentState === 'failed' ? 'bad' : 'warn'}>
                        {financePaymentLabel(order.paymentState, t)}
                      </Badge>
                    </td>
                    <td style={css('font-weight: 700')}>
                      {fmtMinor(order.amountPaidMinor ?? order.winningPriceMinor, lang)}
                    </td>
                    <td>{fmtBusinessDateTime(order.createdAt)}</td>
                    <td>{order.paidAt ? fmtBusinessDateTime(order.paidAt) : '—'}</td>
                    <td>
                      {order.fulfillment?.city || order.fulfillment?.phone
                        ? [order.fulfillment.city, order.fulfillment.phone].filter(Boolean).join(' · ')
                        : t('admin.finance.noDelivery')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="adm-hint" style={css('margin: 12px 0 0')}>
            {t('admin.finance.showingOf', {
              n: orders.data?.orders.length ?? 0,
              total: orders.data?.total ?? 0,
            })}
          </p>
        </StateBlock>
      </Panel>
    </div>
  );
}
