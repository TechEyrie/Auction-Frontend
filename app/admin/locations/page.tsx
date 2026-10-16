'use client';

import { useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
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
      <Panel title="Locations" subtitle="Country, city and area identifiers used by listings and forms. Public precision is enforced server-side.">
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <StateBlock loading={list.loading} error={list.error} empty={(list.data?.locations.length ?? 0) === 0} emptyText="No locations configured yet. Seed the QA locations or add one below." onRetry={list.reload}>
          <TableWrap label="Locations">
            <table className="adm-table">
              <caption>{list.data?.locations.length ?? 0} location(s)</caption>
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Label</th>
                  <th scope="col">Country / city / area</th>
                  <th scope="col">Coordinates</th>
                  <th scope="col">Public precision</th>
                  <th scope="col">State</th>
                  <th scope="col">Actions</th>
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
                      <Badge tone={location.active ? 'good' : 'neutral'}>{location.active ? 'active' : 'inactive'}</Badge>
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
                          Edit
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
          title={`Edit ${editKey}`}
          subtitle="Identifiers are immutable; only labels, precision, coordinates, order and state change."
          actions={<GhostButton onClick={() => setEditKey(null)}>Close</GhostButton>}
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
                <Label htmlFor="loc-label">English label</Label>
                <input id="loc-label" className="field" value={edit.labelEn} onChange={(event) => setEdit({ ...edit, labelEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'labelEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-label-ar">Arabic label</Label>
                <input id="loc-label-ar" className="field" value={edit.labelAr} onChange={(event) => setEdit({ ...edit, labelAr: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="loc-lat">Latitude</Label>
                <input id="loc-lat" className="field" value={edit.lat} onChange={(event) => setEdit({ ...edit, lat: event.target.value })} />
                <FieldError>{fieldError(fields, 'lat') ?? fieldError(fields, 'coordinates')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-lng">Longitude</Label>
                <input id="loc-lng" className="field" value={edit.lng} onChange={(event) => setEdit({ ...edit, lng: event.target.value })} />
                <FieldError>{fieldError(fields, 'lng')}</FieldError>
              </div>
              <div>
                <Label htmlFor="loc-precision">Public precision</Label>
                <select id="loc-precision" className="field" value={edit.publicPrecision} onChange={(event) => setEdit({ ...edit, publicPrecision: event.target.value })}>
                  <option value="city">city — no coordinates published</option>
                  <option value="area">area — area key published, no coordinates</option>
                  <option value="exact">exact — coordinates published (requires approval)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="loc-order">Order</Label>
                <input id="loc-order" className="field" type="number" min={0} value={edit.order} onChange={(event) => setEdit({ ...edit, order: event.target.value })} />
              </div>
            </div>
            <label htmlFor="loc-active" style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
              <input id="loc-active" type="checkbox" checked={edit.active} onChange={(event) => setEdit({ ...edit, active: event.target.checked })} />
              Active
            </label>
            <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Save location'}</PrimaryButton>
          </form>
        </Panel>
      )}

      {mayEdit && (
        <Panel title="Add a location" subtitle="Coordinates are optional; they are validated to real ranges before storage.">
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
                <Label htmlFor="new-loc-country">Country (ISO 3166-1 alpha-2)</Label>
                <input id="new-loc-country" className="field" value={create.countryCode} onChange={(event) => setCreate({ ...create, countryCode: event.target.value })} />
                <FieldError>{fieldError(fields, 'countryCode')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-city">City key</Label>
                <input id="new-loc-city" className="field" value={create.cityKey} onChange={(event) => setCreate({ ...create, cityKey: event.target.value })} placeholder="doha" />
                <FieldError>{fieldError(fields, 'cityKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-area">Area key</Label>
                <input id="new-loc-area" className="field" value={create.areaKey} onChange={(event) => setCreate({ ...create, areaKey: event.target.value })} placeholder="al-sadd" />
                <FieldError>{fieldError(fields, 'areaKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-label">English label</Label>
                <input id="new-loc-label" className="field" value={create.labelEn} onChange={(event) => setCreate({ ...create, labelEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'labelEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-loc-lat">Latitude</Label>
                <input id="new-loc-lat" className="field" value={create.lat} onChange={(event) => setCreate({ ...create, lat: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-loc-lng">Longitude</Label>
                <input id="new-loc-lng" className="field" value={create.lng} onChange={(event) => setCreate({ ...create, lng: event.target.value })} />
              </div>
            </div>
            <Hint>Keys are lowercase letters, digits and dashes. The combined key becomes `qa-doha-al-sadd`.</Hint>
            <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Create location'}</PrimaryButton>
          </form>
        </Panel>
      )}
    </div>
  );
}

function fieldsOf(err: unknown): Record<string, string> {
  return err instanceof ApiRequestError ? err.body.fieldErrors : {};
}
