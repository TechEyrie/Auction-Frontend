'use client';

import { useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { useAsync } from '../../../lib/useAsync';
import { fieldError } from '../../../lib/admin';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type Location = {
  key: string;
  countryCode: string;
  cityKey: string;
  areaKey: string;
  labels: { en: string; ar?: string | null };
  point: { type: 'Point'; coordinates: [number, number] } | null;
  publicPrecision: 'city' | 'area' | 'exact';
  active: boolean;
  order: number;
  updatedAt: string;
};

function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Locations.
 *
 * Coordinates are optional and stored as a GeoJSON point, but what the public API returns
 * is decided by the precision policy, not by this screen: `city` publishes no coordinates,
 * `area` adds the area key, and only an explicit `exact` opt-in publishes the point. A
 * private address is therefore never published by accident.
 */
export default function AdminLocationsPage() {
  const { t } = useUiLocale();
  const session = useSession();
  const mayEdit = session.capabilities.includes('inventory.manage');
  const list = useAsync<{ locations: Location[] }>(() => apiFetch('/api/admin/locations', { cache: 'no-store' }), []);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [create, setCreate] = useState({ countryCode: 'QA', cityKey: '', areaKey: '', labelEn: '', labelAr: '', lat: '', lng: '', publicPrecision: 'city', order: '0' });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [edit, setEdit] = useState({ labelEn: '', labelAr: '', lat: '', lng: '', publicPrecision: 'city', active: true, order: '0' });

  async function call(path: string, method: 'POST' | 'PATCH', json: unknown, success: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    setFields({});
    setNotice(null);
    try {
      await apiFetch(path, { method, headers: session.authHeaders(), json });
      setNotice(success);
      list.reload();
      return true;
    } catch (err) {
      setError(apiMessage(err));
      setFields(fieldsOf(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <Panel title={t('admin.locations.title')} subtitle={t('admin.locations.subtitle')}>
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <StateBlock loading={list.loading} error={list.error} empty={(list.data?.locations.length ?? 0) === 0} emptyText={t('admin.locations.empty')} onRetry={list.reload}>
          <TableWrap label={t('admin.locations.tableLabel')}>
            <table className="adm-table">
              <caption>{t('admin.locations.caption', { count: list.data?.locations.length ?? 0 })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('admin.locations.colKey')}</th>
                  <th scope="col">{t('admin.locations.colLabel')}</th>
                  <th scope="col">{t('admin.locations.colGeo')}</th>
                  <th scope="col">{t('admin.locations.colCoords')}</th>
                  <th scope="col">{t('admin.locations.colPrecision')}</th>
                  <th scope="col">{t('admin.locations.colState')}</th>
                  <th scope="col">{t('admin.common.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.locations.map((location) => (
                  <tr key={location.key} aria-selected={editKey === location.key}>
                    <td>{location.key}</td>
                    <td className="wrap">
                      {location.labels.en}
                      {location.labels.ar ? ` · ${location.labels.ar}` : ''}
                    </td>
                    <td>
                      {location.countryCode} / {location.cityKey} / {location.areaKey}
                    </td>
                    <td>{location.point ? `${location.point.coordinates[1]}, ${location.point.coordinates[0]}` : '—'}</td>
                    <td>
                      <Badge tone={location.publicPrecision === 'exact' ? 'warn' : 'neutral'}>{location.publicPrecision}</Badge>
                    </td>
                    <td>
                      <Badge tone={location.active ? 'good' : 'neutral'}>{location.active ? t('admin.locations.stateActive') : t('admin.locations.stateInactive')}</Badge>
                    </td>
                    <td>
                      {mayEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditKey(location.key);
                            setEdit({
                              labelEn: location.labels.en,
                              labelAr: location.labels.ar ?? '',
                              lat: location.point ? String(location.point.coordinates[1]) : '',
                              lng: location.point ? String(location.point.coordinates[0]) : '',
                              publicPrecision: location.publicPrecision,
                              active: location.active,
                              order: String(location.order),
                            });
                          }}
                          style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                        >
                          {t('admin.common.edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Panel>

      {editKey && mayEdit && (
        <Panel
          title={t('admin.locations.edit', { key: editKey })}
          subtitle={t('admin.locations.editSubtitle')}
          actions={<GhostButton onClick={() => setEditKey(null)}>{t('admin.common.close')}</GhostButton>}
        >
          <form
            className="adm-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call(
                `/api/admin/locations/${editKey}`,
                'PATCH',
                {
                  labelEn: edit.labelEn,
                  labelAr: edit.labelAr || null,
                  coordinates: edit.lat && edit.lng ? { lat: Number(edit.lat), lng: Number(edit.lng) } : null,
                  publicPrecision: edit.publicPrecision,
                  active: edit.active,
                  order: Number(edit.order),
                },
                `${editKey} updated.`,
              );
              if (ok) setEditKey(null);
            }}
          >
            <div className="adm-grid">
              <div>
                <Label htmlFor="loc-label">{t('admin.locations.labelEn')}</Label>
                <input id="loc-label" className="field" value={edit.labelEn} onChange={(event) => setEdit({ ...edit, labelEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'labelEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-label-ar">{t('admin.locations.labelAr')}</Label>
                <input id="loc-label-ar" className="field" value={edit.labelAr} onChange={(event) => setEdit({ ...edit, labelAr: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="loc-lat">{t('admin.locations.lat')}</Label>
                <input id="loc-lat" className="field" value={edit.lat} onChange={(event) => setEdit({ ...edit, lat: event.target.value })} />
                <FieldError>{fieldError(fields, 'lat') ?? fieldError(fields, 'coordinates')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-lng">{t('admin.locations.lng')}</Label>
                <input id="loc-lng" className="field" value={edit.lng} onChange={(event) => setEdit({ ...edit, lng: event.target.value })} />
                <FieldError>{fieldError(fields, 'lng')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-precision">{t('admin.locations.publicPrecision')}</Label>
                <select id="loc-precision" className="field" value={edit.publicPrecision} onChange={(event) => setEdit({ ...edit, publicPrecision: event.target.value })}>
                  <option value="city">{t('admin.locations.precisionCity')}</option>
                  <option value="area">{t('admin.locations.precisionArea')}</option>
                  <option value="exact">{t('admin.locations.precisionExact')}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="loc-order">{t('admin.locations.order')}</Label>
                <input id="loc-order" className="field" type="number" min={0} value={edit.order} onChange={(event) => setEdit({ ...edit, order: event.target.value })} />
              </div>
            </div>
            <label htmlFor="loc-active" style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
              <input id="loc-active" type="checkbox" checked={edit.active} onChange={(event) => setEdit({ ...edit, active: event.target.checked })} />
              {t('admin.locations.active')}
            </label>
            <PrimaryButton disabled={busy}>{busy ? t('admin.common.saving') : t('admin.locations.saveLocation')}</PrimaryButton>
          </form>
        </Panel>
      )}

      {mayEdit && (
        <Panel title={t('admin.locations.add')} subtitle={t('admin.locations.addSubtitle')}>
          <form
            className="adm-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call(
                '/api/admin/locations',
                'POST',
                {
                  countryCode: create.countryCode,
                  cityKey: create.cityKey,
                  areaKey: create.areaKey,
                  labelEn: create.labelEn,
                  labelAr: create.labelAr || null,
                  coordinates: create.lat && create.lng ? { lat: Number(create.lat), lng: Number(create.lng) } : null,
                  publicPrecision: create.publicPrecision,
                  order: Number(create.order),
                },
                `${create.countryCode.toLowerCase()}-${create.cityKey}-${create.areaKey} created.`,
              );
              if (ok) setCreate({ ...create, cityKey: '', areaKey: '', labelEn: '', labelAr: '', lat: '', lng: '' });
            }}
          >
            <div className="adm-grid">
              <div>
                <Label htmlFor="new-loc-country">{t('admin.locations.countryIso')}</Label>
                <input id="new-loc-country" className="field" value={create.countryCode} onChange={(event) => setCreate({ ...create, countryCode: event.target.value })} />
                <FieldError>{fieldError(fields, 'countryCode')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-city">{t('admin.locations.cityKey')}</Label>
                <input id="new-loc-city" className="field" value={create.cityKey} onChange={(event) => setCreate({ ...create, cityKey: event.target.value })} placeholder="doha" />
                <FieldError>{fieldError(fields, 'cityKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-area">{t('admin.locations.areaKey')}</Label>
                <input id="new-loc-area" className="field" value={create.areaKey} onChange={(event) => setCreate({ ...create, areaKey: event.target.value })} placeholder="al-sadd" />
                <FieldError>{fieldError(fields, 'areaKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-label">{t('admin.locations.labelEn')}</Label>
                <input id="new-loc-label" className="field" value={create.labelEn} onChange={(event) => setCreate({ ...create, labelEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'labelEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-lat">{t('admin.locations.lat')}</Label>
                <input id="new-loc-lat" className="field" value={create.lat} onChange={(event) => setCreate({ ...create, lat: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-loc-lng">{t('admin.locations.lng')}</Label>
                <input id="new-loc-lng" className="field" value={create.lng} onChange={(event) => setCreate({ ...create, lng: event.target.value })} />
              </div>
            </div>
            <Hint>{t('admin.locations.keysHint')}</Hint>
            <PrimaryButton disabled={busy}>{busy ? t('admin.common.saving') : t('admin.locations.createLocation')}</PrimaryButton>
          </form>
        </Panel>
      )}
    </div>
  );
}

function fieldsOf(err: unknown): Record<string, string> {
  return err instanceof ApiRequestError ? err.body.fieldErrors : {};
}
