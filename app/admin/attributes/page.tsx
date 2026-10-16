'use client';

import { useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import {
  ATTRIBUTE_TYPES,
  EMPTY_FIELD_ROW,
  TYPES_WITH_CONSTRAINTS,
  TYPES_WITH_OPTIONS,
  fieldError,
  fieldsToPayload,
  isDependable,
  moveItem,
  payloadToRows,
  type AttributeFieldRow,
  type AttributeTypeName,
} from '../../../lib/admin';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap, Toggle } from '../ui';

type SchemaField = {
  key: string;
  type: AttributeTypeName;
  labelEn: string;
  unit?: string | null;
  required: boolean;
  filterable: boolean;
  publicDisplay: boolean;
  adminOnly: boolean;
  options: Array<{ key: string; labelEn: string }>;
  constraints?: Record<string, unknown>;
  dependsOn?: { field: string; equals?: unknown; in?: unknown } | null;
};

type SchemaVersion = {
  _id: string;
  categoryKey: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  fields: SchemaField[];
  notes: string | null;
  createdBy: string;
  publishedBy: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

type ValidationResult = { ok: boolean; errors: Record<string, string>; values: Record<string, unknown>; version: number | null };

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
 * Versioned category attribute schemas.
 *
 * Publishing is one-way: a published version is immutable and stays readable forever, so
 * listings created against version 1 can always be re-read. Edits therefore always target a
 * draft, and the published/archived rows are displayed read-only.
 *
 * The editor is deliberately declarative. A dependency is "show this field when that field
 * equals …" and nothing more, because the backend has no expression language to evaluate.
 */
export default function AdminAttributesPage() {
  const session = useSession();
  const mayEdit = session.capabilities.includes('inventory.manage');

  const categories = useAsync<{ categories: Array<{ key: string; name: string; depth: number; active: boolean }> }>(
    () => apiFetch('/api/admin/categories?includeInactive=true', { cache: 'no-store' }),
    [],
  );

  const [categoryKey, setCategoryKey] = useState('');
  const versions = useAsync<{ schemas: SchemaVersion[] }>(
    () => (categoryKey ? apiFetch<{ schemas: SchemaVersion[] }>(`/api/admin/attribute-schemas?categoryKey=${encodeURIComponent(categoryKey)}`, { cache: 'no-store' }) : Promise.resolve({ schemas: [] })),
    [categoryKey],
  );

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [rows, setRows] = useState<AttributeFieldRow[]>([]);
  const [draftNotes, setDraftNotes] = useState('');

  const [valuesText, setValuesText] = useState('{\n  \n}');
  const [audience, setAudience] = useState<'public' | 'admin'>('public');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const schemas = versions.data?.schemas ?? [];
  const current = schemas.find((schema) => schema.status === 'published') ?? null;

  async function call<T>(path: string, method: 'POST' | 'PATCH', json: unknown, success: string): Promise<T | null> {
    setBusy(true);
    setError(null);
    setFields({});
    setNotice(null);
    try {
      const result = await apiFetch<T>(path, { method, headers: session.authHeaders(), json });
      setNotice(success);
      versions.reload();
      return result;
    } catch (err) {
      setError(apiMessage(err));
      setFields(fieldErrorsOf(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(nextRows: AttributeFieldRow[], notes: string): Promise<SchemaVersion | null> {
    const payload = fieldsToPayload(nextRows);
    if (draftId) {
      const updated = await call<{ schema: SchemaVersion }>(`/api/admin/attribute-schemas/${draftId}`, 'PATCH', { fields: payload, notes: notes || null }, 'Draft saved.');
      return updated?.schema ?? null;
    }
    const created = await call<{ schema: SchemaVersion }>('/api/admin/attribute-schemas', 'POST', { categoryKey, fields: payload, notes: notes || null }, 'Draft created.');
    if (created?.schema) setDraftId(created.schema._id);
    return created?.schema ?? null;
  }

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <Panel
        title="Category attributes"
        subtitle="Versioned schemas. Publishing a draft makes it the current version and archives the previous one, which stays readable."
      >
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>{notice}</p>}

        <div className="adm-filters">
          <div className="adm-filter">
            <Label htmlFor="attr-category">Category</Label>
            <StateBlock loading={categories.loading} error={categories.error} onRetry={categories.reload}>
              <select
                id="attr-category"
                className="field"
                value={categoryKey}
                onChange={(event) => {
                  setCategoryKey(event.target.value);
                  setDraftId(null);
                  setRows([]);
                  setValidation(null);
                }}
              >
                <option value="">Choose a category…</option>
                {(categories.data?.categories ?? []).map((category) => (
                  <option key={category.key} value={category.key}>
                    {'— '.repeat(category.depth)}
                    {category.name} ({category.key})
                  </option>
                ))}
              </select>
            </StateBlock>
          </div>
          {mayEdit && categoryKey && (
            <div className="adm-actions">
              <GhostButton
                onClick={() => {
                  setDraftId(null);
                  setDraftNotes('');
                  setRows([{ ...EMPTY_FIELD_ROW }]);
                  setNotice('New draft started. Add fields, then save it.');
                }}
              >
                New draft version
              </GhostButton>
            </div>
          )}
        </div>

        {!categoryKey ? (
          <p className="adm-state" data-state="empty">
            Choose a category to see its schema versions.
          </p>
        ) : (
          <StateBlock loading={versions.loading} error={versions.error} empty={schemas.length === 0} emptyText="This category has no schema yet. Create a draft to define its fields." onRetry={versions.reload}>
            <TableWrap label="Schema versions">
              <table className="adm-table">
                <caption>{schemas.length} version(s)</caption>
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Status</th>
                    <th scope="col">Fields</th>
                    <th scope="col">Published by</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schemas.map((schema) => (
                    <tr key={schema._id} aria-selected={schema._id === draftId}>
                      <td>v{schema.version}</td>
                      <td>
                        <Badge tone={schema.status === 'published' ? 'good' : schema.status === 'draft' ? 'warn' : 'neutral'}>{schema.status}</Badge>
                      </td>
                      <td>{schema.fields.length}</td>
                      <td>{schema.publishedBy ?? '—'}</td>
                      <td>{new Date(schema.updatedAt).toISOString().slice(0, 10)}</td>
                      <td>
                        <div className="adm-actions">
                          {mayEdit && schema.status === 'draft' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftId(schema._id);
                                  setRows(payloadToRows(schema.fields));
                                  setDraftNotes(schema.notes ?? '');
                                  setNotice(`Editing v${schema.version} (draft).`);
                                }}
                                style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                              >
                                Edit draft
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void call(`/api/admin/attribute-schemas/${schema._id}/publish`, 'POST', {}, `v${schema.version} published as the current version.`)}
                                style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                              >
                                Publish
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDraftId(null);
                              setRows(payloadToRows(schema.fields));
                              setDraftNotes(schema.notes ?? '');
                              setNotice(`Viewing v${schema.version} (${schema.status}).`);
                            }}
                            style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                          >
                            View fields
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </StateBlock>
        )}
      </Panel>

      {rows.length > 0 && (
        <Panel
          title={draftId ? 'Edit draft fields' : 'Field preview'}
          subtitle={draftId ? 'Saving keeps this version a draft; nothing is live until you publish.' : 'This version is not editable. Start a new draft to change the fields.'}
          actions={
            mayEdit && draftId ? (
              <PrimaryButton
                type="button"
                disabled={busy}
                onClick={async () => {
                  const saved = await saveDraft(rows, draftNotes);
                  if (saved) {
                    setRows(payloadToRows(saved.fields));
                    setDraftNotes(saved.notes ?? '');
                  }
                }}
              >
                {busy ? 'Saving…' : 'Save draft'}
              </PrimaryButton>
            ) : undefined
          }
        >
          {mayEdit && draftId && (
            <div style={css('margin-bottom: 14px')}>
              <Label htmlFor="draft-notes">Editor notes</Label>
              <input id="draft-notes" className="field" value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} />
            </div>
          )}
          <div style={css('display: flex; flex-direction: column; gap: 12px')}>
            {rows.map((row, index) => (
              <FieldRow
                key={`${row.key}-${index}`}
                row={row}
                index={index}
                count={rows.length}
                readOnly={!mayEdit || !draftId}
                onChange={(next) => setRows((current) => current.map((item, position) => (position === index ? next : item)))}
                onRemove={() => setRows((current) => current.filter((_, position) => position !== index))}
                onMove={(to) => setRows((current) => moveItem(current, index, to))}
              />
            ))}
          </div>
          {mayEdit && draftId && (
            <div className="adm-actions" style={css('margin-top: 14px')}>
              <GhostButton onClick={() => setRows((current) => [...current, { ...EMPTY_FIELD_ROW }])}>Add field</GhostButton>
            </div>
          )}
        </Panel>
      )}

      {current && (
        <Panel
          title="Validate values"
          subtitle={`Check a value set against v${current.version} before it reaches a listing. This is the same validator the server uses.`}
        >
          <div className="adm-grid">
            <div>
              <Label htmlFor="validate-audience">Audience</Label>
              <select id="validate-audience" className="field" value={audience} onChange={(event) => setAudience(event.target.value as 'public' | 'admin')}>
                <option value="public">public</option>
                <option value="admin">admin</option>
              </select>
              <Hint>Public validation strips admin-only fields, so a public form cannot even see them.</Hint>
            </div>
          </div>
          <div style={css('margin-top: 14px')}>
            <Label htmlFor="validate-values">Values (JSON)</Label>
            <textarea
              id="validate-values"
              className="field"
              rows={6}
              value={valuesText}
              onChange={(event) => setValuesText(event.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="adm-actions" style={css('margin-top: 12px')}>
            <PrimaryButton
              type="button"
              disabled={busy || !categoryKey}
              onClick={async () => {
                setValidation(null);
                let parsed: Record<string, unknown>;
                try {
                  parsed = JSON.parse(valuesText) as Record<string, unknown>;
                } catch {
                  setError('The values must be valid JSON.');
                  return;
                }
                await call<ValidationResult>(
                  `/api/admin/attribute-schemas/${categoryKey}/validate`,
                  'POST',
                  { values: parsed, audience, version: current.version },
                  'Validation ran.',
                ).then((result) => {
                  if (result) setValidation(result);
                });
              }}
            >
              {busy ? 'Validating…' : 'Validate'}
            </PrimaryButton>
          </div>
          {validation && (
            <div style={css('margin-top: 12px')} role="status">
              <p className="adm-note" data-tone={validation.ok ? 'good' : 'bad'}>
                {validation.ok ? `Accepted against v${validation.version}.` : 'Rejected:'}
              </p>
              {!validation.ok && (
                <ul style={css('margin: 8px 0 0; padding-left: 18px; color: #8A2C11; font-size: 14px')}>
                  {Object.entries(validation.errors).map(([key, message]) => (
                    <li key={key}>
                      {key}: {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>
      )}

      {!mayEdit && (
        <p className="adm-state" data-state="empty">
          Your account can view schemas but not edit them.
        </p>
      )}
    </div>
  );
}

function FieldRow({
  row,
  index,
  count,
  readOnly,
  onChange,
  onRemove,
  onMove,
}: {
  row: AttributeFieldRow;
  index: number;
  count: number;
  readOnly: boolean;
  onChange: (next: AttributeFieldRow) => void;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  const usesOptions = TYPES_WITH_OPTIONS.includes(row.type);
  const usesConstraints = TYPES_WITH_CONSTRAINTS.includes(row.type);
  const canDepend = isDependable(row.type);
  const id = (suffix: string) => `field-${index}-${suffix}`;

  return (
    <div className="adm-fieldrow">
      <div className="adm-fieldrow-head">
        <strong style={css('font-size: 15px')}>{row.key || `Field ${index + 1}`}</strong>
        <div className="adm-actions">
          <GhostButton onClick={() => onMove(index - 1)} disabled={readOnly || index === 0} title="Move up">
            ↑
          </GhostButton>
          <GhostButton onClick={() => onMove(index + 1)} disabled={readOnly || index === count - 1} title="Move down">
            ↓
          </GhostButton>
          <GhostButton onClick={onRemove} disabled={readOnly}>
            Remove
          </GhostButton>
        </div>
      </div>

      <div className="adm-grid">
        <div>
          <Label htmlFor={id('key')}>Key</Label>
          <input id={id('key')} className="field" value={row.key} disabled={readOnly} onChange={(event) => onChange({ ...row, key: event.target.value })} placeholder="model_name" />
        </div>
        <div>
          <Label htmlFor={id('label')}>English label</Label>
          <input id={id('label')} className="field" value={row.labelEn} disabled={readOnly} onChange={(event) => onChange({ ...row, labelEn: event.target.value })} />
        </div>
        <div>
          <Label htmlFor={id('type')}>Type</Label>
          <select
            id={id('type')}
            className="field"
            value={row.type}
            disabled={readOnly}
            onChange={(event) => onChange({ ...row, type: event.target.value as AttributeTypeName })}
          >
            {ATTRIBUTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={id('unit')}>Unit</Label>
          <input id={id('unit')} className="field" value={row.unit} disabled={readOnly} onChange={(event) => onChange({ ...row, unit: event.target.value })} placeholder="km" />
        </div>
      </div>

      <div className="adm-toggles">
        <Toggle id={id('required')} label="Required" checked={row.required} onChange={(next) => !readOnly && onChange({ ...row, required: next })} />
        <Toggle id={id('filterable')} label="Filterable" checked={row.filterable} onChange={(next) => !readOnly && onChange({ ...row, filterable: next })} />
        <Toggle id={id('public')} label="Public display" checked={row.publicDisplay} onChange={(next) => !readOnly && onChange({ ...row, publicDisplay: next })} />
        <Toggle id={id('admin')} label="Admin only" checked={row.adminOnly} onChange={(next) => !readOnly && onChange({ ...row, adminOnly: next })} />
      </div>

      {usesOptions && (
        <div>
          <Label htmlFor={id('options')}>Options (one per line, as `key: Label`)</Label>
          <textarea id={id('options')} className="field" rows={4} value={row.optionsText} disabled={readOnly} onChange={(event) => onChange({ ...row, optionsText: event.target.value })} />
          <Hint>A key is lowercase letters, digits, dashes or underscores.</Hint>
        </div>
      )}

      {usesConstraints && (
        <div className="adm-grid">
          {row.type === 'number' ? (
            <>
              <div>
                <Label htmlFor={id('min')}>Minimum</Label>
                <input id={id('min')} className="field" value={row.min} disabled={readOnly} onChange={(event) => onChange({ ...row, min: event.target.value })} />
              </div>
              <div>
                <Label htmlFor={id('max')}>Maximum</Label>
                <input id={id('max')} className="field" value={row.max} disabled={readOnly} onChange={(event) => onChange({ ...row, max: event.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor={id('minlength')}>Minimum length</Label>
                <input id={id('minlength')} className="field" value={row.minLength} disabled={readOnly} onChange={(event) => onChange({ ...row, minLength: event.target.value })} />
              </div>
              <div>
                <Label htmlFor={id('maxlength')}>Maximum length</Label>
                <input id={id('maxlength')} className="field" value={row.maxLength} disabled={readOnly} onChange={(event) => onChange({ ...row, maxLength: event.target.value })} />
              </div>
              <div>
                <Label htmlFor={id('pattern')}>Pattern</Label>
                <input id={id('pattern')} className="field" value={row.pattern} disabled={readOnly} onChange={(event) => onChange({ ...row, pattern: event.target.value })} placeholder="^[0-9]+$" />
              </div>
            </>
          )}
        </div>
      )}

      {canDepend && (
        <div className="adm-grid">
          <div>
            <Label htmlFor={id('dep-field')}>Show when field</Label>
            <input id={id('dep-field')} className="field" value={row.dependsOnField} disabled={readOnly} onChange={(event) => onChange({ ...row, dependsOnField: event.target.value })} placeholder="condition" />
          </div>
          <div>
            <Label htmlFor={id('dep-equals')}>Equals</Label>
            <input id={id('dep-equals')} className="field" value={row.dependsOnEquals} disabled={readOnly} onChange={(event) => onChange({ ...row, dependsOnEquals: event.target.value })} placeholder="used" />
          </div>
          <div>
            <Label htmlFor={id('dep-in')}>Or is one of (comma separated)</Label>
            <input id={id('dep-in')} className="field" value={row.dependsOnIn} disabled={readOnly} onChange={(event) => onChange({ ...row, dependsOnIn: event.target.value })} />
            <Hint>Declarative only — dependencies cannot contain expressions.</Hint>
          </div>
        </div>
      )}
      {!canDepend && row.dependsOnField && (
        <FieldError>Only select, multiselect and boolean fields can drive a dependency.</FieldError>
      )}
    </div>
  );
}
