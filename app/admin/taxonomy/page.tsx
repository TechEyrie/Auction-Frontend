'use client';

import { useMemo, useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { fieldError } from '../../../lib/admin';
import { CategoryIcon } from '../../../lib/categoryIcons';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap } from '../ui';

type CategoryIconOption = { key: string; label: string };

function CategoryIconPicker({
  value,
  onChange,
  icons,
  idPrefix,
}: {
  value: string;
  onChange: (key: string) => void;
  icons: CategoryIconOption[];
  idPrefix: string;
}) {
  const selected = value || 'tag';
  return (
    <div
      role="radiogroup"
      aria-label="Category icon"
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
const METHOD_LABEL: Record<ListingMethod, string> = {
  auction: 'Auction',
  fixed_price: 'Fixed price',
  enquiry: 'Enquiry',
};

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
        title="Categories"
        subtitle="One canonical tree for admin tools and public pages. Subcategories nest up to four levels."
        actions={
          <GhostButton onClick={() => setIncludeInactive((value) => !value)}>
            {includeInactive ? 'Hide archived' : 'Show archived'}
          </GhostButton>
        }
      >
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <StateBlock loading={list.loading} error={list.error} empty={roots.length === 0} emptyText="No categories yet." onRetry={list.reload}>
          <TableWrap label="Categories">
            <table className="adm-table">
              <caption>{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</caption>
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Name</th>
                  <th scope="col">Depth</th>
                  <th scope="col">Listing methods</th>
                  <th scope="col">Schema</th>
                  <th scope="col">Order</th>
                  <th scope="col">State</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roots.map((root) => [root, ...childrenOf(root.key)].map((category) => (
                  <tr key={category.key} aria-selected={editing === category.key}>
                    <td style={css(`padding-left: ${14 + category.depth * 22}px`)}>
                      {category.depth > 0 ? '↳ ' : ''}
                      {category.key}
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
                    <td>{category.listingMethods.map((method) => METHOD_LABEL[method]).join(', ')}</td>
                    <td>{category.attributeSchemaVersion === null ? '—' : `v${category.attributeSchemaVersion}`}</td>
                    <td>{category.order}</td>
                    <td>
                      <Badge tone={category.active ? 'good' : 'neutral'}>{category.active ? 'active' : 'archived'}</Badge>
                    </td>
                    <td>
                      <div className="adm-actions">
                        {mayEdit && (
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
                            style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                          >
                            Edit
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
                            Add child
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
          title={`Edit ${editing}`}
          subtitle="Saved against the hierarchy version this form loaded."
          actions={<GhostButton onClick={() => setEditing(null)}>Close</GhostButton>}
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
                <Label htmlFor="cat-name-en">English name</Label>
                <input id="cat-name-en" className="field" value={edit.nameEn} onChange={(event) => setEdit({ ...edit, nameEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'nameEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-name-ar">Arabic name</Label>
                <input id="cat-name-ar" className="field" value={edit.nameAr} onChange={(event) => setEdit({ ...edit, nameAr: event.target.value })} />
              </div>
              <div style={css('grid-column: 1 / -1')}>
                <span className="lbl">Icon</span>
                <CategoryIconPicker
                  idPrefix="edit-cat-icon"
                  value={edit.icon}
                  onChange={(icon) => setEdit({ ...edit, icon })}
                  icons={iconOptions}
                />
                <FieldError>{fieldError(fields, 'icon')}</FieldError>
              </div>
              <div>
                <Label htmlFor="cat-order">Order</Label>
                <input id="cat-order" className="field" type="number" min={0} value={edit.order} onChange={(event) => setEdit({ ...edit, order: event.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="cat-desc">English description</Label>
              <textarea id="cat-desc" className="field" rows={2} value={edit.descriptionEn} onChange={(event) => setEdit({ ...edit, descriptionEn: event.target.value })} />
            </div>
            <fieldset style={css('border: 0; padding: 0; margin: 0')}>
              <legend className="lbl">Allowed listing methods</legend>
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
                    {METHOD_LABEL[method]}
                  </label>
                ))}
              </div>
              {edit.methods.includes('auction') && <Hint>Auction selling is a pending business decision; enabling it here is not approval to run auctions.</Hint>}
              <FieldError>{fieldError(fields, 'listingMethods')}</FieldError>
            </fieldset>
            <label htmlFor="cat-active" style={css('display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600')}>
              <input id="cat-active" type="checkbox" checked={edit.active} onChange={(event) => setEdit({ ...edit, active: event.target.checked })} />
              Active (visible to public pages)
            </label>
            <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</PrimaryButton>
          </form>

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
            <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700")}>Archive or restore</h3>
            <Hint>Archiving is refused while active children still point at this category.</Hint>
            <div>
              <Label htmlFor="cat-reason">Reason</Label>
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
                Archive
              </GhostButton>
              <GhostButton
                onClick={async () => {
                  await call(`/api/admin/categories/${editing}/restore`, 'POST', { reason }, `${editing} restored.`);
                }}
                disabled={busy}
              >
                Restore
              </GhostButton>
            </div>
          </form>
        </Panel>
      )}

      {mayEdit && (
        <Panel title="Add a category" subtitle="Keys are stable identifiers: they are never renamed by the UI.">
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
                <Label htmlFor="new-cat-key">Key</Label>
                <input id="new-cat-key" className="field" value={create.key} onChange={(event) => setCreate({ ...create, key: event.target.value })} placeholder="luxury-watches" />
                <FieldError>{fieldError(fields, 'key')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-cat-parent">Parent</Label>
                <select id="new-cat-parent" className="field" value={create.parentKey} onChange={(event) => setCreate({ ...create, parentKey: event.target.value })}>
                  <option value="">Top level</option>
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
                <Label htmlFor="new-cat-name">English name</Label>
                <input id="new-cat-name" className="field" value={create.nameEn} onChange={(event) => setCreate({ ...create, nameEn: event.target.value })} />
                <FieldError>{fieldError(fields, 'nameEn')}</FieldError>
              </div>
              <div>
                <Label htmlFor="new-cat-name-ar">Arabic name</Label>
                <input id="new-cat-name-ar" className="field" value={create.nameAr} onChange={(event) => setCreate({ ...create, nameAr: event.target.value })} />
              </div>
              <div>
                <Label htmlFor="new-cat-order">Order</Label>
                <input id="new-cat-order" className="field" type="number" min={0} value={create.order} onChange={(event) => setCreate({ ...create, order: event.target.value })} />
              </div>
              <div style={css('grid-column: 1 / -1')}>
                <span className="lbl">Icon</span>
                <CategoryIconPicker
                  idPrefix="new-cat-icon"
                  value={create.icon}
                  onChange={(icon) => setCreate({ ...create, icon })}
                  icons={iconOptions}
                />
                <FieldError>{fieldError(fields, 'icon')}</FieldError>
              </div>
            </div>
            <fieldset style={css('border: 0; padding: 0; margin: 0')}>
              <legend className="lbl">Allowed listing methods</legend>
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
                    {METHOD_LABEL[method]}
                  </label>
                ))}
              </div>
              <FieldError>{fieldError(fields, 'listingMethods')}</FieldError>
            </fieldset>
            <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Create category'}</PrimaryButton>
          </form>
        </Panel>
      )}
    </div>
  );
}
