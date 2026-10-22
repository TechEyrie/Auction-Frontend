'use client';

import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useAsync } from '../../../lib/useAsync';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { Badge, GhostButton, PageHeader, Panel, StateBlock, TableWrap } from '../ui';

type Enquiry = {
  reference: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  listingReference?: string | null;
  status: string;
};

export default function AdminEnquiriesPage() {
  const { t } = useUiLocale();
  const inbox = useAsync<{ enquiries: Enquiry[] }>(() => apiFetch('/api/admin/enquiries'), []);

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader title={t('admin.enquiries.title')} subtitle={t('admin.enquiries.subtitle')} />

      <Panel title={t('admin.enquiries.inbox')} actions={<GhostButton onClick={() => inbox.reload()}>{t('admin.common.reload')}</GhostButton>}>
        <StateBlock
          loading={!inbox.data && !inbox.error}
          error={inbox.error}
          empty={(inbox.data?.enquiries ?? []).length === 0}
          emptyText={t('admin.enquiries.empty')}
          onRetry={inbox.reload}
        >
          <TableWrap label={t('admin.enquiries.tableCaption')}>
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">{t('admin.enquiries.colReference')}</th>
                  <th scope="col">{t('admin.enquiries.colListing')}</th>
                  <th scope="col">{t('admin.enquiries.colFrom')}</th>
                  <th scope="col">{t('admin.enquiries.colSubject')}</th>
                  <th scope="col">{t('admin.enquiries.colMessage')}</th>
                  <th scope="col">{t('admin.enquiries.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {(inbox.data?.enquiries ?? []).map((item) => (
                  <tr key={item.reference}>
                    <td>{item.reference}</td>
                    <td className="wrap">
                      {item.listingReference ? (
                        <a href={`/product/${encodeURIComponent(item.listingReference)}`}>{item.listingReference}</a>
                      ) : (
                        <span className="adm-hint">—</span>
                      )}
                    </td>
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
