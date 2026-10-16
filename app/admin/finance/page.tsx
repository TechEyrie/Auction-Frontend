'use client';

import { FormEvent, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { fmtMinor } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { Badge, GhostButton, Label, PageHeader, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type Summary = { definitions: { collectedRevenueMinor: string }; collectedRevenueMinor: number; unpaidWins: number; unsettledPayableMinor: number };
type Row = { orderReference: string; paymentState: string; winningPriceMinor: number; sellerNetAmountMinor: number | null; settlementState: string };

export default function AdminFinancePage() {
  const session = useSession();
  const [q, setQ] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const summary = useAsync<Summary>(() => apiFetch<Summary>('/api/admin/finance/summary'), []);
  const orders = useAsync<{ orders: Row[]; total: number }>(
    () => apiFetch(`/api/admin/finance/orders?page=1&limit=20&q=${encodeURIComponent(q)}&paymentState=${encodeURIComponent(paymentState)}`),
    [q, paymentState],
  );

  const settle = async (event: FormEvent, orderReference: string) => {
    event.preventDefault();
    setMessage(null);
    try {
      await apiFetch('/api/admin/finance/settlements', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { orderReference, reason, confirm: true },
      });
      setMessage(`Recorded a manual settlement for ${orderReference}`);
      orders.reload();
      summary.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Settlement was not recorded');
    }
  };

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader title="Finance" subtitle="Collected revenue, unpaid wins, and manual seller settlements." />

      <Panel title="Summary">
        <p style={css('margin: 0; font-size: 16px')}>
          Collected <strong>{summary.data != null ? fmtMinor(summary.data.collectedRevenueMinor) : '…'}</strong>
          {' · '}
          Unpaid wins <Badge tone="warn">{summary.data?.unpaidWins ?? '…'}</Badge>
        </p>
      </Panel>

      <Panel title="Orders">
        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            orders.reload();
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="fin-q">Order reference</Label>
            <input id="fin-q" className="field" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-pay">Payment</Label>
            <select id="fin-pay" className="field" value={paymentState} onChange={(e) => setPaymentState(e.target.value)}>
              <option value="">Any</option>
              <option value="paid">Paid</option>
              <option value="awaiting_payment">Unpaid</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="fin-reason">Settlement reason (required)</Label>
            <input id="fin-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
          </div>
          <div className="adm-actions">
            <PrimaryButton>Filter</PrimaryButton>
          </div>
        </form>

        {message && (
          <p className="adm-note" data-tone="good" role="status" style={css('margin-bottom: 14px')}>
            {message}
          </p>
        )}

        <StateBlock loading={orders.loading} error={orders.error} empty={(orders.data?.orders ?? []).length === 0} emptyText="No orders match." onRetry={orders.reload}>
          <TableWrap label="Finance orders">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Price</th>
                  <th scope="col">Seller net</th>
                  <th scope="col">Settlement</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {(orders.data?.orders ?? []).map((order) => (
                  <tr key={order.orderReference}>
                    <td>{order.orderReference}</td>
                    <td>{order.paymentState}</td>
                    <td>{fmtMinor(order.winningPriceMinor)}</td>
                    <td>{order.sellerNetAmountMinor != null ? fmtMinor(order.sellerNetAmountMinor) : 'Unresolved'}</td>
                    <td>{order.settlementState}</td>
                    <td>
                      <form onSubmit={(event) => settle(event, order.orderReference)}>
                        <GhostButton type="submit">Record settlement</GhostButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Panel>
    </div>
  );
}
