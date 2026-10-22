'use client';

import { useMemo, useState } from 'react';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import { useAsync } from '../../../lib/useAsync';
import { fieldError } from '../../../lib/admin';
import { mediaUrl } from '../../../lib/listings';
import { CategoryIcon } from '../../../lib/categoryIcons';
import { methodLabel } from '../../../lib/uiMessages';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type CategoryIconOption = { key: string; label: string };

function CategoryIconPicker({
  value,
  onChange,
  icons,
  idPrefix,
  ariaLabel,
}: {
  value: string;
  onChange: (key: string) => void;
  icons: CategoryIconOption[];
  idPrefix: string;
  ariaLabel: string;
}) {
  const selected = value || 'tag';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={css('display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px')}
    >
      {icons.map((entry) => {
        const on = selected === entry.key;
        return (
          <button
            key={entry.key}
            type="button"
            role="radio"
            aria-checked={on}
            id={`${idPrefix}-${entry.key}`}
            onClick={() => onChange(entry.key)}
            style={css(
              `display: flex; flex-direction: column; align-items: center; gap: 4px; width: 88px; padding: 8px 6px; border-radius: 10px; border: 1px solid ${on ? '#9A6B12' : '#E6E4DF'}; background: ${on ? '#F6EEDC' : '#FFFFFF'}; box-shadow: ${on ? '0 0 0 1px #9A6B12' : 'none'}; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; color: #15191E`,
            )}
          >
            <CategoryIcon icon={entry.key} size={24} />
            <span style={css('text-align: center; line-height: 1.2')}>{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type ListingMethod = 'auction' | 'fixed_price' | 'enquiry';

type Category = {
  key: string;
  parentKey: string | null;
  depth: number;
  name: string;
  description: string | null;
  icon: string | null;
  order: number;
  listingMethods: ListingMethod[];
  attributeSchemaVersion: number | null;
  imageAssetId: string | null;
  imageUrl: string | null;
  active: boolean;
  hierarchyVersion: number;
  labels: { en: { name: string; description: string | null }; ar?: { name: string; description: string | null } | null };
  ancestors: string[];
  createdBy: string;
  updatedBy: string | null;
  updatedAt: string;
  archivedAt: string | null;
};

const METHODS: ListingMethod[] = ['auction', 'fixed_price', 'enquiry'];
function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function fieldErrorsOf(err: unknown): Record<string, string> {
  return err instanceof ApiRequestError ? err.body.fieldErrors : {};
}

/**
 * Canonical taxonomy.
 *
 * The hierarchy is edited through the API, which owns every invariant — unique keys, depth
 * limits, cycle prevention and conditional writes. This screen therefore reports conflicts
 * instead of guessing: a 409 means someone else changed the tree, and the list reloads.
 *
 * Auction is deliberately not enabled for the seeded categories; enabling it here is a
 * business decision recorded in docs/OPEN_QUESTIONS.md, not a UI default.
 */
export default function AdminTaxonomyPage() {
  const { t, lang } = useUiLocale();
  const session = useSession();
  const [includeInactive, setIncludeInactive] = useState(true);
  const mayEdit = session.capabilities.includes('inventory.manage');

  const list = useAsync<{ categories: Category[] }>(
    () => apiFetch<{ categories: Category[] }>(`/api/admin/categories?includeInactive=${includeInactive}`, { cache: 'no-store' }),
    [includeInactive],
  );
  const iconCatalog = useAsync<{ icons: CategoryIconOption[] }>(
    () => apiFetch<{ icons: CategoryIconOption[] }>('/api/catalog/category-icons', { cache: 'no-store' }),
    [],
  );
  const iconOptions = iconCatalog.data?.icons ?? [];

  const categories = list.data?.categories ?? [];
  const roots = useMemo(() => categories.filter((category) => category.parentKey === null).sort((a, b) => a.order - b.order), [categories]);
  const childrenOf = (key: string) => categories.filter((category) => category.parentKey === key).sort((a, b) => a.order - b.order);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const [create, setCreate] = useState({
    key: '',
    parentKey: '',
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    icon: 'tag',
    order: '0',
    methods: ['fixed_price', 'enquiry'] as ListingMethod[],
  });
  const [edit, setEdit] = useState({
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    icon: 'tag',
    order: '0',
    active: true,
    methods: ['fixed_price', 'enquiry'] as ListingMethod[],
    hierarchyVersion: 1,
  });
  const [reason, setReason] = useState('');

  async function call(path: string, method: 'POST' | 'PATCH', json: unknown, success: string) {
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
      setFields(fieldErrorsOf(err));
      if (err instanceof ApiRequestError && err.status === 409) list.reload();
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEditing(category: Category) {
    setEditing(category.key);
    setError(null);
    setNotice(null);
    setFields({});
    setEdit({
      nameEn: category.labels.en.name,
      nameAr: category.labels.ar?.name ?? '',
      descriptionEn: category.labels.en.description ?? '',
      icon: category.icon ?? 'tag',
      order: String(category.order),
      active: category.active,
      methods: category.listingMethods,
      hierarchyVersion: category.hierarchyVersion,
    });
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <Panel
        title={t('admin.taxonomy.title')}
        subtitle={t('admin.taxonomy.subtitle')}
        actions={
          <GhostButton onClick={() => setIncludeInactive((value) => !value)}>
            {includeInactive ? t('admin.taxonomy.hideArchived') : t('admin.taxonomy.showArchived')}
          </GhostButton>
        }
      >
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <StateBlock loading={list.loading} error={list.error} empty={roots.length === 0} emptyText={t('admin.taxonomy.empty')} onRetry={list.reload}>
          <TableWrap label={t('admin.taxonomy.tableLabel')}>
            <table className="adm-table">
              <caption>{t('admin.taxonomy.caption', { count: categories.length })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('admin.taxonomy.colKey')}</th>
                  <th scope="col">{t('admin.taxonomy.colPhoto')}</th>
                  <th scope="col">{t('admin.taxonomy.colName')}</th>
                  <th scope="col">{t('admin.taxonomy.colDepth')}</th>
                  <th scope="col">{t('admin.taxonomy.colMethods')}</th>
                  <th scope="col">{t('admin.taxonomy.colSchema')}</th>
                  <th scope="col">{t('admin.taxonomy.colOrder')}</th>
                  <th scope="col">{t('admin.taxonomy.colState')}</th>
                  <th scope="col">{t('admin.taxonomy.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {roots.map((root) => [root, ...childrenOf(root.key)].map((category) => (
                  <tr key={category.key} aria-selected={editing === category.key}>
                    <td style={css(`padding-left: ${14 + category.depth * 22}px`)}>
                      {category.depth > 0 ? '↳ ' : ''}
                      {category.key}
                    </td>
                    <td>
                      {category.imageUrl ? (
                        <img
                          src={mediaUrl(API_BASE_URL, category.imageUrl)}
                          alt=""
                          width={36}
                          height={36}
                          style={css('object-fit: cover; border-radius: 6px; display: block')}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="wrap">
                      <span style={css('display: inline-flex; align-items: center; gap: 8px')}>
                        <CategoryIcon icon={category.icon} size={18} />
                        <span>
                          {category.labels.en.name}
                          {category.labels.ar?.name ? ` · ${category.labels.ar.name}` : ''}
                        </span>
                      </span>
                    </td>
                    <td>{category.depth}</td>
                    <td>{category.listingMethods.map((method) => methodLabel(lang, method)).join(', ')}</td>
                    <td>{category.attributeSchemaVersion === null ? '—' : `v${category.attributeSchemaVersion}`}</td>
                    <td>{category.order}</td>
                    <td>
                      <Badge tone={category.active ? 'good' : 'neutral'}>{category.active ? t('admin.taxonomy.stateActive') : t('admin.taxonomy.stateArchived')}</Badge>
                    </td>
                    <td>
                      <div className="adm-actions">
                        {mayEdit && (
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
                            style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                          >
                            {t('admin.common.edit')}
                          </button>
                        )}
                        {mayEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(null);
                              setCreate({ ...create, parentKey: category.key });
                              setNotice(`New subcategory will be created under ${category.key}.`);
                            }}
                            style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                          >
                            {t('admin.taxonomy.addChild')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </TableWrap>
        </StateBlock>
      </Panel>

      {editing && (
        <Panel
          title={t('admin.taxonomy.editCategory', { key: editing })}
          subtitle={t('admin.taxonomy.editSubtitle')}
          actions={<GhostButton onClick={() => setEditing(null)}>{t('admin.common.close')}</GhostButton>}
        >
          <form
            className="adm-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call(
                `/api/admin/categories/${editing}`,
                'PATCH',
                {
                  nameEn: edit.nameEn,
                  nameAr: edit.nameAr || null,
                  descriptionEn: edit.descriptionEn || null,
                  icon: edit.icon || 'tag',
                  order: Number(edit.order),
                  active: edit.active,
                  listingMethods: edit.methods,
                  expectedHierarchyVersion: edit.hierarchyVersion,
                },
                `${editing} updated.`,
              );
              if (ok) setEditing(null);
            }}
          >
            <div className="adm-grid">
              <div>
                <Label htmlFor="cat-name-en">{t('admin.taxonomy.nameEn')}</Label>
                <input id="cat-name-en" className="field" value={edit.nameEn} onChange={(event) => setEdit({ ...edit, nameEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'nameEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-name-ar">{t('admin.taxonomy.nameAr')}</Label>
                <input id="cat-name-ar" className="field" value={edit.nameAr} onChange={(event) => setEdit({ ...edit, nameAr: event.target.value })} />
              </div>
              <div style={css('grid-column: 1 / -1')}>
                <span className="lbl">{t('admin.taxonomy.icon')}</span>
                <CategoryIconPicker
                  idPrefix="edit-cat-icon"
                  value={edit.icon}
                  onChange={(icon) => setEdit({ ...edit, icon })}
                  icons={iconOptions}
                  ariaLabel={t('admin.taxonomy.iconAria')}
                />
                <FieldError>{fieldError(fields, 'icon')}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-order">{t('admin.taxonomy.colOrder')}</Label>
                <input id="cat-order" className="field" type="number" min={0} value={edit.order} onChange={(event) => setEdit({ ...edit, order: event.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="cat-desc">{t('admin.taxonomy.descEn')}</Label>
              <textarea id="cat-desc" className="field" rows={2} value={edit.descriptionEn} onChange={(event) => setEdit({ ...edit, descriptionEn: event.target.value })} />
            </div>
            <fieldset style={css('border: 0; padding: 0; margin: 0')}>
              <legend className="lbl">{t('admin.taxonomy.allowedMethods')}</legend>
              <div className="adm-toggles">
                {METHODS.map((method) => (
                  <label key={method} htmlFor={`edit-method-${method}`} style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
                    <input
                      id={`edit-method-${method}`}
                      type="checkbox"
                      checked={edit.methods.includes(method)}
                      onChange={(event) =>
                        setEdit({
                          ...edit,
                          methods: event.target.checked ? [...edit.methods, method] : edit.methods.filter((value) => value !== method),
                        })
                      }
                    />
                    {methodLabel(lang, method)}
                  </label>
                ))}
              </div>
              {edit.methods.includes('auction') && <Hint>{t('admin.taxonomy.auctionHint')}</Hint>}
              <FieldError>{fieldError(fields, 'listingMethods')}</FieldError>
            </fieldset>
            <label htmlFor="cat-active" style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
              <input id="cat-active" type="checkbox" checked={edit.active} onChange={(event) => setEdit({ ...edit, active: event.target.checked })} />
              {t('admin.taxonomy.activeVisible')}
            </label>
            <PrimaryButton disabled={busy}>{busy ? t('admin.common.saving') : t('admin.taxonomy.saveChanges')}</PrimaryButton>
          </form>

          {mayEdit && editing && (
            <div style={css('margin-top: 18px; border-top: 1px solid #E6E4DF; padding-top: 16px')}>
              <h3 style={css("margin: 0 0 8px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700")}>{t('admin.taxonomy.categoryPhoto')}</h3>
              <Hint>{t('admin.taxonomy.categoryPhotoHint')}</Hint>
              {(() => {
                const category = categories.find((item) => item.key === editing);
                const preview = category?.imageUrl ? mediaUrl(API_BASE_URL, category.imageUrl) : null;
                return preview ? (
                  <img src={preview} alt="" style={css('margin-top: 10px; max-width: 200px; border-radius: 8px; display: block')} />
                ) : (
                  <p className="adm-note" style={css('margin-top: 10px')}>{t('admin.taxonomy.noPhoto')}</p>
                );
              })()}
              <div className="adm-actions" style={css('margin-top: 12px')}>
                <label className={busy ? 'lw-upload-zone lw-upload-zone--disabled' : 'lw-upload-zone'} style={css('flex: 1; min-width: 200px')}>
                  <p className="lw-upload-zone__title">{t('admin.taxonomy.uploadReplace')}</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="lw-upload-zone__input"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file || !editing) return;
                      setBusy(true);
                      setError(null);
                      void new Promise<void>((resolve) => {
                        const request = new XMLHttpRequest();
                        request.open('POST', `${API_BASE_URL}/api/admin/categories/${editing}/image`);
                        request.withCredentials = true;
                        request.setRequestHeader('content-type', file.type || 'application/octet-stream');
                        for (const [name, value] of Object.entries(session.authHeaders())) request.setRequestHeader(name, value);
                        request.onload = () => {
                          if (request.status === 201) {
                            setNotice(`${editing} photo updated.`);
                            list.reload();
                          } else {
                            try {
                              const body = JSON.parse(request.responseText) as { error?: { message?: string } };
                              setError(body.error?.message ?? `Upload failed with status ${request.status}`);
                            } catch {
                              setError(`Upload failed with status ${request.status}`);
                            }
                          }
                          resolve();
                        };
                        request.onerror = () => {
                          setError('The upload could not reach the server.');
                          resolve();
                        };
                        request.send(file);
                      }).finally(() => setBusy(false));
                    }}
                  />
                </label>
                {categories.find((item) => item.key === editing)?.imageUrl ? (
                  <GhostButton
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        await apiFetch(`/api/admin/categories/${editing}/image`, {
                          method: 'DELETE',
                          headers: session.authHeaders(),
                          json: { reason: 'Removed category photo' },
                        });
                        setNotice(`${editing} photo removed.`);
                        list.reload();
                      } catch (err) {
                        setError(apiMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t('admin.taxonomy.removePhoto')}
                  </GhostButton>
                ) : null}
              </div>
            </div>
          )}

          <form
            className="adm-form"
            style={css('margin-top: 18px; border-top: 1px solid #E6E4DF; padding-top: 16px')}
            onSubmit={async (event) => {
              event.preventDefault();
              const category = categories.find((item) => item.key === editing);
              const action = category?.active ? 'archive' : 'restore';
              const ok = await call(`/api/admin/categories/${editing}/${action}`, 'POST', { reason }, `${editing} ${action}d.`);
              if (ok) {
                setReason('');
                setEditing(null);
              }
            }}
          >
            <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700")}>{t('admin.taxonomy.archiveRestore')}</h3>
            <Hint>{t('admin.taxonomy.archiveHint')}</Hint>
            <div>
              <Label htmlFor="cat-reason">{t('admin.field.reason')}</Label>
              <input id="cat-reason" className="field" value={reason} onChange={(event) => setReason(event.target.value)} />
              <FieldError>{fieldError(fields, 'reason')}</FieldError>
            </div>
            <div className="adm-actions">
              <GhostButton
                onClick={async () => {
                  await call(`/api/admin/categories/${editing}/archive`, 'POST', { reason }, `${editing} archived.`);
                }}
                disabled={busy}
              >
                {t('admin.taxonomy.archive')}
              </GhostButton>
              <GhostButton
                onClick={async () => {
                  await call(`/api/admin/categories/${editing}/restore`, 'POST', { reason }, `${editing} restored.`);
                }}
                disabled={busy}
              >
                {t('admin.taxonomy.restore')}
              </GhostButton>
            </div>
          </form>
        </Panel>
      )}

      {mayEdit && (
        <Panel title={t('admin.taxonomy.addCategory')} subtitle={t('admin.taxonomy.addSubtitle')}>
          <form
            className="adm-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await call(
                '/api/admin/categories',
                'POST',
                {
                  key: create.key,
                  parentKey: create.parentKey || null,
                  nameEn: create.nameEn,
                  nameAr: create.nameAr || null,
                  descriptionEn: create.descriptionEn || null,
                  icon: create.icon || 'tag',
                  order: Number(create.order),
                  listingMethods: create.methods,
                },
                `Category ${create.key} created.`,
              );
              if (ok) setCreate({ ...create, key: '', nameEn: '', nameAr: '', descriptionEn: '' });
            }}
          >
            <div className="adm-grid">
              <div>
                <Label htmlFor="new-cat-key">{t('admin.taxonomy.key')}</Label>
                <input id="new-cat-key" className="field" value={create.key} onChange={(event) => setCreate({ ...create, key: event.target.value })} placeholder="luxury-watches" />
                <FieldError>{fieldError(fields, 'key')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-cat-parent">{t('admin.taxonomy.parent')}</Label>
                <select id="new-cat-parent" className="field" value={create.parentKey} onChange={(event) => setCreate({ ...create, parentKey: event.target.value })}>
                  <option value="">{t('admin.taxonomy.topLevel')}</option>
                  {categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {'— '.repeat(category.depth)}
                      {category.key}
                    </option>
                  ))}
                </select>
                <FieldError>{fieldError(fields, 'parentKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-cat-name">{t('admin.taxonomy.nameEn')}</Label>
                <input id="new-cat-name" className="field" value={create.nameEn} onChange={(event) => setCreate({ ...create, nameEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'nameEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-cat-name-ar">{t('admin.taxonomy.nameAr')}</Label>
                <input id="new-cat-name-ar" className="field" value={create.nameAr} onChange={(event) => setCreate({ ...create, nameAr: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-cat-order">{t('admin.taxonomy.colOrder')}</Label>
                <input id="new-cat-order" className="field" type="number" min={0} value={create.order} onChange={(event) => setCreate({ ...create, order: event.target.value })} />
              </div>
              <div style={css('grid-column: 1 / -1')}>
                <span className="lbl">{t('admin.taxonomy.icon')}</span>
                <CategoryIconPicker
                  idPrefix="new-cat-icon"
                  value={create.icon}
                  onChange={(icon) => setCreate({ ...create, icon })}
                  icons={iconOptions}
                  ariaLabel={t('admin.taxonomy.iconAria')}
                />
                <FieldError>{fieldError(fields, 'icon')}</FieldError>
              </div>
            </div>
            <fieldset style={css('border: 0; padding: 0; margin: 0')}>
              <legend className="lbl">{t('admin.taxonomy.allowedMethods')}</legend>
              <div className="adm-toggles">
                {METHODS.map((method) => (
                  <label key={method} htmlFor={`new-method-${method}`} style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
                    <input
                      id={`new-method-${method}`}
                      type="checkbox"
                      checked={create.methods.includes(method)}
                      onChange={(event) =>
                        setCreate({
                          ...create,
                          methods: event.target.checked ? [...create.methods, method] : create.methods.filter((value) => value !== method),
                        })
                      }
                    />
                    {methodLabel(lang, method)}
                  </label>
                ))}
              </div>
              <FieldError>{fieldError(fields, 'listingMethods')}</FieldError>
            </fieldset>
            <PrimaryButton disabled={busy}>{busy ? t('admin.common.saving') : t('admin.taxonomy.createCategory')}</PrimaryButton>
          </form>
        </Panel>
      )}
    </div>
  );
}
