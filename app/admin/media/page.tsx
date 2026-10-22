'use client';

import { useRef, useState } from 'react';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { useAsync } from '../../../lib/useAsync';
import { formatBytes, moveItem } from '../../../lib/admin';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type Asset = {
  assetId: string;
  storageKey: string | null;
  stagingKey: string | null;
  collectionKey: string;
  position: number;
  isCover: boolean;
  declaredMime: string;
  mime: string | null;
  bytes: number;
  checksum: string | null;
  image: { width: number; height: number } | null;
  status: 'staging' | 'ready' | 'rejected' | 'failed';
  statusReason: string | null;
  metadataStripped: boolean;
  source: 'upload';
  createdBy: string;
  createdAt: string;
  url: string | null;
};

type Limits = { maxFiles: number; maxBytes: number; maxDimension: number; allowedTypes: string[]; videoEnabled: boolean };

function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

const STATUS_TONE: Record<Asset['status'], 'good' | 'warn' | 'bad' | 'neutral'> = {
  ready: 'good',
  staging: 'neutral',
  rejected: 'bad',
  failed: 'warn',
};

/**
 * Media pipeline.
 *
 * The screen only ever shows assets the server actually stored and validated: there is no
 * field for pasting an image URL, because a client-supplied URL is not a verified upload.
 * Bytes go up as a raw body so the browser reports real upload progress, and a rejection
 * from the server (forged type, oversized file, video) leaves a visible record with the
 * reason instead of a silent nothing.
 */
export default function AdminMediaPage() {
  const { t } = useUiLocale();
  const session = useSession();
  const mayManage = session.capabilities.includes('inventory.manage');
  const [collectionKey, setCollectionKey] = useState('listing-draft-1');
  const [activeKey, setActiveKey] = useState('listing-draft-1');

  const resource = useAsync<{ assets: Asset[]; limit: Limits }>(
    () => apiFetch(`/api/admin/media?collectionKey=${encodeURIComponent(activeKey)}`, { cache: 'no-store' }),
    [activeKey],
  );

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const assets = resource.data?.assets ?? [];
  const limit = resource.data?.limit ?? null;
  const readyAssets = assets.filter((asset) => asset.status === 'ready');

  async function call<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', json: unknown, success: string): Promise<T | null> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiFetch<T>(path, { method, headers: session.authHeaders(), json });
      setNotice(success);
      resource.reload();
      return result;
    } catch (err) {
      setError(apiMessage(err));
      resource.reload();
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Raw-body upload through XMLHttpRequest: the only way to show real progress. */
  function upload(file: File): void {
    setError(null);
    setNotice(null);
    setProgress(0);
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE_URL}/api/admin/media/upload`);
    request.withCredentials = true;
    request.setRequestHeader('content-type', file.type || 'application/octet-stream');
    request.setRequestHeader('x-collection-key', activeKey);
    for (const [name, value] of Object.entries(session.authHeaders())) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      setProgress(null);
      if (request.status === 201) {
        setNotice(`Uploaded ${file.name}.`);
      } else {
        try {
          const body = JSON.parse(request.responseText) as { error?: { message?: string } };
          setError(body.error?.message ?? `Upload failed with status ${request.status}`);
        } catch {
          setError(`Upload failed with status ${request.status}`);
        }
      }
      resource.reload();
    };
    request.onerror = () => {
      setProgress(null);
      setError('The upload could not reach the server.');
    };
    request.send(file);
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <Panel
        title={t('admin.media.title')}
        subtitle={t('admin.media.subtitle')}
        actions={
          limit && (
            <Badge tone={limit.videoEnabled ? 'warn' : 'neutral'}>
              {limit.videoEnabled ? t('admin.media.videoEnabled') : t('admin.media.imagesOnly')}
            </Badge>
          )
        }
      >
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setActiveKey(collectionKey.trim() || 'listing-draft-1');
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="media-collection">{t('admin.media.collectionKey')}</Label>
            <input id="media-collection" className="field" value={collectionKey} onChange={(event) => setCollectionKey(event.target.value)} />
            <Hint>{t('admin.media.collectionHint')}</Hint>
          </div>
          <div className="adm-actions">
            <PrimaryButton>{t('admin.media.loadCollection')}</PrimaryButton>
            {mayManage && (
              <GhostButton onClick={() => resource.reload()} disabled={resource.loading}>
                {t('admin.common.reload')}
              </GhostButton>
            )}
          </div>
        </form>

        {limit && (
          <dl className="adm-grid" style={css('margin: 0 0 16px; font-size: 14px; color: #5B636B')}>
            <div>
              <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>{t('admin.media.maxFiles')}</dt>
              <dd style={css('margin: 4px 0 0')}>{limit.maxFiles}</dd>
            </div>
            <div>
              <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>{t('admin.media.maxSize')}</dt>
              <dd style={css('margin: 4px 0 0')}>{formatBytes(limit.maxBytes)}</dd>
            </div>
            <div>
              <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>{t('admin.media.maxDimension')}</dt>
              <dd style={css('margin: 4px 0 0')}>{limit.maxDimension}px</dd>
            </div>
            <div>
              <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>{t('admin.media.acceptedTypes')}</dt>
              <dd style={css('margin: 4px 0 0')}>{limit.allowedTypes.join(', ')}</dd>
            </div>
          </dl>
        )}

        {mayManage && (
          <div style={css('margin-bottom: 16px')}>
            <Label htmlFor="media-file">{t('admin.media.uploadImage')}</Label>
            <input
              id="media-file"
              ref={fileInput}
              type="file"
              accept={(limit?.allowedTypes ?? ['image/jpeg', 'image/png', 'image/webp']).join(',')}
              className="field"
              style={css('height: auto; padding: 12px 14px')}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
            />
            {progress !== null && (
              <div style={css('margin-top: 10px')} role="status" aria-live="polite">
                <div className="adm-progress">
                  <span style={{ display: 'block', height: '100%', width: `${progress}%`, background: '#9A6B12' }} />
                </div>
                <p className="adm-hint">{t('admin.media.uploading', { pct: progress })}</p>
              </div>
            )}
            <Hint>{t('admin.media.uploadExifHint')}</Hint>
          </div>
        )}

        <StateBlock
          loading={resource.loading}
          error={resource.error}
          empty={assets.length === 0}
          emptyText={t('admin.media.emptyCollection')}
          onRetry={resource.reload}
        >
          <div className="adm-thumbs">
            {assets.map((asset, index) => (
              <figure key={asset.assetId} className="adm-thumb">
                {asset.status === 'ready' && asset.url ? (
                  <img src={`${API_BASE_URL}${asset.url}`} alt={`Preview of ${asset.assetId}`} />
                ) : (
                  <div className="ph">{asset.status === 'failed' ? t('admin.media.processingFailed') : asset.status === 'rejected' ? t('admin.media.rejectedLabel') : t('admin.media.notAvailable')}</div>
                )}
                <figcaption style={css('display: flex; flex-direction: column; gap: 8px')}>
                  <div className="adm-actions">
                    <Badge tone={STATUS_TONE[asset.status]}>{asset.status}</Badge>
                    {asset.isCover && <Badge tone="good">{t('admin.media.coverBadge')}</Badge>}
                    <span className="adm-hint">#{index + 1}</span>
                  </div>
                  <span className="adm-hint">
                    {asset.mime ?? asset.declaredMime} · {formatBytes(asset.bytes)}
                    {asset.image ? ` · ${asset.image.width}×${asset.image.height}` : ''}
                  </span>
                  <span className="adm-hint">
                    {asset.metadataStripped ? t('admin.media.metadataStripped') : t('admin.media.metadataNotProcessed')} · {asset.assetId}
                  </span>
                  {asset.statusReason && <FieldError>{asset.statusReason}</FieldError>}
                  {mayManage && (
                    <div className="adm-actions">
                      <GhostButton
                        title={t('admin.media.moveEarlier')}
                        disabled={busy || index === 0}
                        onClick={() =>
                          void reorder(moveItem(readyAssets.map((item) => item.assetId), readyAssets.indexOf(asset), readyAssets.indexOf(asset) - 1))
                        }
                      >
                        ↑
                      </GhostButton>
                      <GhostButton
                        title={t('admin.media.moveLater')}
                        disabled={busy || index === readyAssets.length - 1 || asset.status !== 'ready'}
                        onClick={() =>
                          void reorder(moveItem(readyAssets.map((item) => item.assetId), readyAssets.indexOf(asset), readyAssets.indexOf(asset) + 1))
                        }
                      >
                        ↓
                      </GhostButton>
                      <GhostButton disabled={busy || asset.status !== 'ready' || asset.isCover} onClick={() => void call(`/api/admin/media/collection/${activeKey}/cover`, 'PATCH', { assetId: asset.assetId }, 'Cover updated.')}>
                        {t('admin.media.makeCover')}
                      </GhostButton>
                      {asset.status === 'failed' && (
                        <GhostButton disabled={busy} onClick={() => void call(`/api/admin/media/${asset.assetId}/retry`, 'POST', {}, 'Upload promoted.')}>
                          {t('admin.media.retry')}
                        </GhostButton>
                      )}
                      <GhostButton disabled={busy} onClick={() => void remove(asset)}>
                        {t('admin.common.delete')}
                      </GhostButton>
                    </div>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </StateBlock>
      </Panel>

      {mayManage && (
        <Panel title={t('admin.media.orphanTitle')} subtitle={t('admin.media.orphanSubtitle')}>
          <CleanupPanel run={(json) => call<{ candidates: string[]; removed: string[] }>('/api/admin/media/cleanup', 'POST', json, 'Cleanup finished.')} busy={busy} />
        </Panel>
      )}

      <TableWrap label={t('admin.media.recordsTable')}>
        <table className="adm-table">
          <caption>{t('admin.media.recordsCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('admin.media.colAsset')}</th>
              <th scope="col">{t('admin.media.colStatus')}</th>
              <th scope="col">{t('admin.media.colPosition')}</th>
              <th scope="col">{t('admin.media.colSize')}</th>
              <th scope="col">{t('admin.media.colStored')}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.assetId}>
                <td>{asset.assetId}</td>
                <td>
                  <Badge tone={STATUS_TONE[asset.status]}>{asset.status}</Badge>
                </td>
                <td>{asset.position}</td>
                <td>{formatBytes(asset.bytes)}</td>
                <td>{asset.storageKey ? t('admin.media.storedYes') : t('admin.media.storedNo')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );

  async function reorder(assetIds: string[]): Promise<void> {
    await call(`/api/admin/media/collection/${activeKey}/order`, 'PATCH', { assetIds }, 'Order saved.');
  }

  async function remove(asset: { assetId: string; status: string }): Promise<void> {
    const reason = window.prompt(`Reason for deleting ${asset.assetId}?`);
    if (!reason || reason.trim().length < 3) {
      setNotice(null);
      setError('Deleting media needs a written reason (at least 3 characters), so the audit trail stays meaningful.');
      return;
    }
    await call(`/api/admin/media/${asset.assetId}`, 'DELETE', { reason: reason.trim() }, `${asset.assetId} removed.`);
  }
}

function CleanupPanel({
  run,
  busy,
}: {
  run: (json: { olderThanHours: number; apply: boolean }) => Promise<{ candidates: string[]; removed: string[] } | null>;
  busy: boolean;
}) {
  const { t } = useUiLocale();
  const [hours, setHours] = useState('24');
  const [result, setResult] = useState<{ candidates: string[]; removed: string[] } | null>(null);

  return (
    <div className="adm-form">
      <div className="adm-grid">
        <div>
          <Label htmlFor="cleanup-hours">{t('admin.media.cleanupHours')}</Label>
          <input id="cleanup-hours" className="field" type="number" min={1} value={hours} onChange={(event) => setHours(event.target.value)} />
        </div>
      </div>
      <div className="adm-actions">
        <GhostButton
          disabled={busy}
          onClick={async () => {
            setResult(await run({ olderThanHours: Number(hours), apply: false }));
          }}
        >
          {t('admin.media.dryRun')}
        </GhostButton>
        <GhostButton
          disabled={busy}
          onClick={async () => {
            setResult(await run({ olderThanHours: Number(hours), apply: true }));
          }}
        >
          {t('admin.media.applyCleanup')}
        </GhostButton>
      </div>
      {result && (
        <div role="status" className="adm-hint">
          <p style={css('margin: 0 0 6px')}>{t('admin.media.candidates', { list: result.candidates.length === 0 ? t('admin.media.none') : result.candidates.join(', ') })}</p>
          <p style={css('margin: 0')}>{t('admin.media.removed', { list: result.removed.length === 0 ? t('admin.media.none') : result.removed.join(', ') })}</p>
        </div>
      )}
    </div>
  );
}
