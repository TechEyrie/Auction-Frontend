'use client';

import { useState } from 'react';
import { API_BASE_URL } from '../../../lib/api';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { fmtBusinessDateTime, fmtMinor } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
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
  sourceLabel: string;
  listingTitle: string;
  listingReference: string;
  paymentState: string;
  paymentLabel: string;
  amountPaidMinor: number;
  winningPriceMinor: number;
  createdAt: string;
  paidAt: string | null;
};

export default function AdminFinancePage() {
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
        title="Finance"
        subtitle="Customer payments retained by the platform. Seller payouts are not active."
        actions={
          <GhostButton type="button" disabled={exportBusy} onClick={() => void exportCsv()}>
            {exportBusy ? 'Exporting…' : 'Export CSV'}
          </GhostButton>
        }
      />

      <div style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px')}>
        <Panel title="Collected revenue">
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #9A6B12")}>
            {summary.data != null ? fmtMinor(summary.data.collectedRevenueMinor) : '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            Full amount customers paid on completed orders.
          </p>
        </Panel>
        <Panel title="Awaiting payment">
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700")}>
            {awaiting ?? '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            Orders not marked paid yet.
          </p>
        </Panel>
        <Panel title="All orders">
          <p style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; font-weight: 700")}>
            {summary.data?.orderCount ?? '…'}
          </p>
          <p className="adm-hint" style={css('margin: 8px 0 0')}>
            Auction wins and buy-now purchases.
          </p>
        </Panel>
      </div>

      <Panel
        title="Orders"
        actions={
          <GhostButton onClick={() => { orders.reload(); summary.reload(); }} disabled={orders.loading}>
            Reload
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
            <Label htmlFor="fin-q">Search</Label>
            <input
              id="fin-q"
              className="field"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Order or listing reference"
            />
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-pay">Payment</Label>
            <select id="fin-pay" className="field" value={paymentState} onChange={(event) => setPaymentState(event.target.value)}>
              <option value="">Any</option>
              <option value="paid">Paid</option>
              <option value="awaiting_payment">Awaiting payment</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="adm-actions">
            <PrimaryButton>Filter</PrimaryButton>
          </div>
        </form>

        <StateBlock
          loading={orders.loading}
          error={orders.error}
          empty={(orders.data?.orders ?? []).length === 0}
          emptyText="No orders match."
          onRetry={orders.reload}
        >
          <TableWrap label="Platform orders">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Type</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Amount paid</th>
                  <th scope="col">Created</th>
                  <th scope="col">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {(orders.data?.orders ?? []).map((order) => (
                  <tr key={order.orderReference}>
                    <td className="wrap">
                      <span style={css('font-weight: 600')}>{order.listingTitle}</span>
                      <div className="adm-hint">{order.listingReference}</div>
                    </td>
                    <td>{order.sourceLabel}</td>
                    <td>
                      <Badge tone={order.paymentState === 'paid' ? 'good' : order.paymentState === 'failed' ? 'bad' : 'warn'}>
                        {order.paymentLabel}
                      </Badge>
                    </td>
                    <td style={css('font-weight: 700')}>{fmtMinor(order.amountPaidMinor ?? order.winningPriceMinor)}</td>
                    <td>{fmtBusinessDateTime(order.createdAt)}</td>
                    <td>{order.paidAt ? fmtBusinessDateTime(order.paidAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <p className="adm-hint" style={css('margin: 12px 0 0')}>
            Showing {orders.data?.orders.length ?? 0} of {orders.data?.total ?? 0} orders. Amount paid is kept by the platform — there is no seller share.
          </p>
        </StateBlock>
      </Panel>
    </div>
  );
}
