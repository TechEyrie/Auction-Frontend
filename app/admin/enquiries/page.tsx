'use client';

import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useAsync } from '../../../lib/useAsync';
import { Badge, GhostButton, PageHeader, Panel, StateBlock, TableWrap } from '../ui';

type Enquiry = { reference: string; name: string; email: string; subject: string; message: string; status: string };

export default function AdminEnquiriesPage() {
  const inbox = useAsync<{ enquiries: Enquiry[] }>(() => apiFetch('/api/admin/enquiries'), []);

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader title="Enquiries" subtitle="Messages from the public enquiry form." />

      <Panel title="Inbox" actions={<GhostButton onClick={() => inbox.reload()}>Reload</GhostButton>}>
        <StateBlock
          loading={!inbox.data && !inbox.error}
          error={inbox.error}
          empty={(inbox.data?.enquiries ?? []).length === 0}
          emptyText="No enquiries yet."
          onRetry={inbox.reload}
        >
          <TableWrap label="Enquiries">
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">From</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Message</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {(inbox.data?.enquiries ?? []).map((item) => (
                  <tr key={item.reference}>
                    <td>{item.reference}</td>
                    <td className="wrap">
                      <div style={css('font-weight: 600')}>{item.name}</div>
                      <div className="adm-hint">{item.email}</div>
                    </td>
                    <td className="wrap">{item.subject}</td>
                    <td className="wrap">{item.message}</td>
                    <td><Badge tone="neutral">{item.status}</Badge></td>
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
