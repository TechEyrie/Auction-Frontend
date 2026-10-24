'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { fmtBusinessDateTime } from '../../../lib/format';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import {
  Badge,
  GhostButton,
  Label,
  Modal,
  PageHeader,
  Panel,
  PrimaryButton,
  StateBlock,
  TableWrap,
} from '../ui';

type EmailLog = {
  id: string;
  to: string;
  subject: string;
  purpose: string;
  status: 'sent' | 'failed';
  error: string | null;
  createdAt: string;
  userReference: string | null;
  listingReference: string | null;
  lotReference: string | null;
  body: string | null;
};

type ModalTab = 'message' | 'related';

function emailLogHasRelated(row: EmailLog): boolean {
  return Boolean(row.listingReference || row.lotReference);
}

export default function AdminEmailLogsPage() {
  const { t } = useUiLocale();
  const session = useSession();
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('message');
  const logs = useAsync<{ emailLogs: EmailLog[] }>(
    () =>
      apiFetch(
        `/api/admin/email-logs?limit=50&q=${encodeURIComponent(appliedQ)}`,
        { cache: 'no-store', headers: session.authHeaders() },
      ),
    [appliedQ, session.user?.publicReference],
  );

  useEffect(() => {
    setModalTab('message');
  }, [selected?.id]);

  const closeModal = () => {
    setSelected(null);
    setModalTab('message');
  };

  if (!session.capabilities.includes('audit.view')) {
    return <p>{t('admin.emailLogs.noAccess')}</p>;
  }

  const showRelatedTab = selected ? emailLogHasRelated(selected) : false;

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
                  <th scope="col">{t('admin.emailLogs.colProduct')}</th>
                  <th scope="col">{t('admin.emailLogs.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data?.emailLogs ?? []).map((row) => (
                  <tr
                    key={row.id}
                    style={css('cursor: pointer')}
                    onClick={() => setSelected(row)}
                  >
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
                    <td className="wrap">
                      {row.listingReference ? (
                        <a
                          href={`/product/${encodeURIComponent(row.listingReference)}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.listingReference}
                        </a>
                      ) : (
                        <span className="adm-hint">{t('admin.emailLogs.noProduct')}</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-link-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(row);
                        }}
                      >
                        {t('admin.emailLogs.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Panel>

      <Modal
        open={selected !== null}
        onClose={closeModal}
        title={t('admin.emailLogs.modalTitle')}
        subtitle={selected?.subject}
        footer={
          <GhostButton type="button" onClick={closeModal}>
            {t('admin.common.close')}
          </GhostButton>
        }
      >
        {selected && (
          <div style={css('display: flex; flex-direction: column; gap: 14px')}>
            {showRelatedTab && (
              <div
                role="tablist"
                aria-label={t('admin.emailLogs.modalTitle')}
                style={css(
                  'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 5px; background: var(--mkt-surface-2); border-radius: 12px',
                )}
              >
                {(['message', 'related'] as const).map((tab) => {
                  const active = modalTab === tab;
                  const label =
                    tab === 'message' ? t('admin.emailLogs.tabMessage') : t('admin.emailLogs.tabRelated');
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      id={`elog-tab-${tab}`}
                      aria-controls={`elog-panel-${tab}`}
                      onClick={() => setModalTab(tab)}
                      style={css(
                        `height: 40px; border: 0; border-radius: 9px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; background: ${active ? 'var(--mkt-surface)' : 'transparent'}; color: ${active ? 'var(--mkt-text)' : 'var(--mkt-muted)'}; box-shadow: ${active ? '0 1px 2px rgba(0,0,0,.06)' : 'none'}`,
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {(!showRelatedTab || modalTab === 'message') && (
              <div
                id="elog-panel-message"
                role={showRelatedTab ? 'tabpanel' : undefined}
                aria-labelledby={showRelatedTab ? 'elog-tab-message' : undefined}
                style={css('display: flex; flex-direction: column; gap: 14px')}
              >
                <div>
                  <Label htmlFor="elog-detail-when">{t('admin.emailLogs.colWhen')}</Label>
                  <div id="elog-detail-when">{fmtBusinessDateTime(selected.createdAt)}</div>
                </div>
                <div>
                  <Label htmlFor="elog-detail-to">{t('admin.emailLogs.colTo')}</Label>
                  <div id="elog-detail-to" className="wrap">{selected.to}</div>
                </div>
                <div>
                  <Label htmlFor="elog-detail-purpose">{t('admin.emailLogs.colPurpose')}</Label>
                  <div id="elog-detail-purpose"><code>{selected.purpose}</code></div>
                </div>
                <div>
                  <Label htmlFor="elog-detail-status">{t('admin.emailLogs.colStatus')}</Label>
                  <div id="elog-detail-status">
                    <Badge tone={selected.status === 'sent' ? 'good' : 'bad'}>
                      {selected.status === 'sent' ? t('admin.emailLogs.statusSent') : t('admin.emailLogs.statusFailed')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label htmlFor="elog-detail-user">{t('admin.emailLogs.colUser')}</Label>
                  <div id="elog-detail-user">{selected.userReference ?? <span className="adm-hint">—</span>}</div>
                </div>
                {selected.error && (
                  <div>
                    <Label htmlFor="elog-detail-error">{t('admin.emailLogs.errorLabel')}</Label>
                    <div id="elog-detail-error" className="adm-hint">{selected.error}</div>
                  </div>
                )}
                <div>
                  <Label htmlFor="elog-detail-body">{t('admin.emailLogs.bodyLabel')}</Label>
                  {selected.body ? (
                    <pre
                      id="elog-detail-body"
                      style={css(
                        'white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.5; margin: 8px 0 0; padding: 12px; background: var(--mkt-bg); border: 1px solid var(--mkt-border); border-radius: 8px; max-height: min(50vh, 420px); overflow: auto',
                      )}
                    >
                      {selected.body}
                    </pre>
                  ) : (
                    <p id="elog-detail-body" className="adm-hint" style={css('margin: 8px 0 0')}>{t('admin.emailLogs.noBody')}</p>
                  )}
                </div>
              </div>
            )}

            {showRelatedTab && modalTab === 'related' && (
              <div
                id="elog-panel-related"
                role="tabpanel"
                aria-labelledby="elog-tab-related"
                style={css('display: flex; flex-direction: column; gap: 10px')}
              >
                {selected.listingReference && (
                  <a href={`/product/${encodeURIComponent(selected.listingReference)}`}>
                    {t('admin.emailLogs.openProduct')} ({selected.listingReference})
                  </a>
                )}
                {selected.lotReference && (
                  <a href={`/lot/${encodeURIComponent(selected.lotReference)}`}>
                    {t('admin.emailLogs.openAuction')} ({selected.lotReference})
                  </a>
                )}
                {selected.listingReference && (
                  <a href={`/admin/listings/${encodeURIComponent(selected.listingReference)}`}>
                    {t('admin.emailLogs.openAdminListing')}
                  </a>
                )}
                {selected.listingReference && (
                  <a href={`/admin/auctions?listing=${encodeURIComponent(selected.listingReference)}`}>
                    {t('admin.emailLogs.openAdminAuctions')}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
