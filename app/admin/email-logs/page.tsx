'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { fmtBusinessDateTime } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { Badge, GhostButton, Label, PageHeader, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  purpose: string;
  status: 'sent' | 'failed';
  error: string | null;
  createdAt: string;
  userReference: string | null;
};

export default function AdminEmailLogsPage() {
  const { t } = useUiLocale();
  const session = useSession();
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const logs = useAsync<{ emailLogs: EmailLog[] }>(
    () =>
      apiFetch(
        `/api/admin/email-logs?limit=50&q=${encodeURIComponent(appliedQ)}`,
        { cache: 'no-store', headers: session.authHeaders() },
      ),
    [appliedQ, session.user?.publicReference],
  );

  if (!session.capabilities.includes('audit.view')) {
    return <p>{t('admin.emailLogs.noAccess')}</p>;
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader title={t('admin.emailLogs.title')} subtitle={t('admin.emailLogs.subtitle')} />

      <Panel
        title={t('admin.emailLogs.recent')}
        actions={<GhostButton onClick={() => logs.reload()}>{t('admin.common.reload')}</GhostButton>}
      >
        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedQ(q.trim());
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="elog-q">{t('admin.field.search')}</Label>
            <input
              id="elog-q"
              className="field"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t('admin.emailLogs.searchPlaceholder')}
            />
          </div>
          <div className="adm-actions">
            <PrimaryButton>{t('admin.common.filter')}</PrimaryButton>
          </div>
        </form>

        <StateBlock
          loading={!logs.data && !logs.error}
          error={logs.error}
          empty={(logs.data?.emailLogs ?? []).length === 0}
          emptyText={t('admin.emailLogs.empty')}
          onRetry={logs.reload}
        >
          <TableWrap label={t('admin.emailLogs.tableCaption')}>
            <table className="adm-table adm-table--sticky-head">
              <thead>
                <tr>
                  <th scope="col">{t('admin.emailLogs.colWhen')}</th>
                  <th scope="col">{t('admin.emailLogs.colTo')}</th>
                  <th scope="col">{t('admin.emailLogs.colSubject')}</th>
                  <th scope="col">{t('admin.emailLogs.colPurpose')}</th>
                  <th scope="col">{t('admin.emailLogs.colStatus')}</th>
                  <th scope="col">{t('admin.emailLogs.colUser')}</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data?.emailLogs ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="nowrap">{fmtBusinessDateTime(row.createdAt)}</td>
                    <td className="wrap">{row.to}</td>
                    <td className="wrap">{row.subject}</td>
                    <td className="wrap"><code>{row.purpose}</code></td>
                    <td>
                      <Badge tone={row.status === 'sent' ? 'good' : 'bad'}>
                        {row.status === 'sent' ? t('admin.emailLogs.statusSent') : t('admin.emailLogs.statusFailed')}
                      </Badge>
                      {row.error && <div className="adm-hint">{row.error}</div>}
                    </td>
                    <td>{row.userReference ?? <span className="adm-hint">—</span>}</td>
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
