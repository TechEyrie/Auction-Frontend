'use client';

import { useState } from 'react';
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
  paymentState: string;
  paymentLabel: string;
  amountPaidMinor: number;
  winningPriceMinor: number;
  createdAt: string;
  paidAt: string | null;
};

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
  const [q, setQ] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const summary = useAsync<Summary>(() => apiFetch<Summary>('/api/admin/finance/summary'), []);
  const orders = useAsync<{ orders: Row[]; total: number }>(
    () =>
      apiFetch(
        `/api/admin/finance/orders?page=1&limit=50&q=${encodeURIComponent(q)}&paymentState=${encodeURIComponent(paymentState)}`,
      ),
    [q, paymentState],
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
            <Label htmlFor="fin-pay">{t('admin.field.payment')}</Label>
            <select id="fin-pay" className="field" value={paymentState} onChange={(event) => setPaymentState(event.target.value)}>
              <option value="">{t('admin.common.any')}</option>
              <option value="paid">{t('admin.finance.paid')}</option>
              <option value="awaiting_payment">{t('admin.finance.awaitingPaymentOption')}</option>
              <option value="failed">{t('admin.finance.failed')}</option>
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
                  <th scope="col">{t('admin.finance.colType')}</th>
                  <th scope="col">{t('admin.finance.colPayment')}</th>
                  <th scope="col">{t('admin.finance.colAmountPaid')}</th>
                  <th scope="col">{t('admin.finance.colCreated')}</th>
                  <th scope="col">{t('admin.finance.colPaidAt')}</th>
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
                      <div className="adm-hint">{order.listingReference}</div>
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
