/**
 * Pure helpers for the administration screens.
 *
 * Kept free of React and of the DOM so the tricky conversions — the attribute field editor
 * payload, option text parsing, pagination windows — are unit-testable without a browser.
 * These functions never decide authorization or validity: the server does that. They only
 * shape what the operator typed into the shape the API expects.
 */

export type ApiFieldErrorMap = Record<string, string>;

/** Turn an API `fieldErrors` map into the message shown next to one field. */
export function fieldError(errors: ApiFieldErrorMap | undefined, name: string): string | null {
  if (!errors) return null;
  return errors[name] ?? errors[`fields.${name}`] ?? null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact page window for a pager: always includes 1, the last page and the current one. */
export function pageWindow(page: number, totalPages: number, span = 1): number[] {
  if (totalPages <= 0) return [];
  const pages = new Set<number>([1, totalPages]);
  for (let offset = -span; offset <= span; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }
  return [...pages].sort((a, b) => a - b);
}

export type AttributeOptionRow = { key: string; labelEn: string };
export type DependencyRow = { field: string; equals: string; in: string };

export type AttributeFieldRow = {
  key: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';
  labelEn: string;
  required: boolean;
  filterable: boolean;
  publicDisplay: boolean;
  adminOnly: boolean;
  unit: string;
  min: string;
  max: string;
  minLength: string;
  maxLength: string;
  pattern: string;
  optionsText: string;
  dependsOnField: string;
  dependsOnEquals: string;
  dependsOnIn: string;
};

export const EMPTY_FIELD_ROW: AttributeFieldRow = {
  key: '',
  type: 'text',
  labelEn: '',
  required: false,
  filterable: false,
  publicDisplay: true,
  adminOnly: false,
  unit: '',
  min: '',
  max: '',
  minLength: '',
  maxLength: '',
  pattern: '',
  optionsText: '',
  dependsOnField: '',
  dependsOnEquals: '',
  dependsOnIn: '',
};

export const ATTRIBUTE_TYPES = ['text', 'number', 'select', 'multiselect', 'boolean', 'date'] as const;
export type AttributeTypeName = (typeof ATTRIBUTE_TYPES)[number];

export const TYPES_WITH_OPTIONS: AttributeTypeName[] = ['select', 'multiselect'];
export const TYPES_WITH_CONSTRAINTS: AttributeTypeName[] = ['text', 'number'];

/** `select`/`multiselect` fields are the only fields another field may depend on. */
export function isDependable(type: AttributeTypeName): boolean {
  return type === 'select' || type === 'multiselect' || type === 'boolean';
}

/** Options are typed one per line as `key: Label` (a bare value uses it for both). */
export function optionsFromText(text: string): AttributeOptionRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawKey, ...rest] = line.split(':');
      const key = (rawKey ?? '').trim().toLowerCase().replace(/\s+/g, '-');
      const label = rest.join(':').trim();
      return { key, labelEn: label || key };
    })
    .filter((option) => option.key.length > 0);
}

export function optionsToText(options: AttributeOptionRow[]): string {
  return options.map((option) => `${option.key}: ${option.labelEn}`).join('\n');
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export type AttributeFieldPayload = {
  key: string;
  type: AttributeTypeName;
  labelEn: string;
  unit: string | null;
  required: boolean;
  filterable: boolean;
  publicDisplay: boolean;
  adminOnly: boolean;
  order: number;
  options: AttributeOptionRow[];
  constraints: Record<string, number | string | boolean | null>;
  dependsOn: { field: string; equals?: string | number | boolean | null; in?: Array<string | number> | null } | null;
};

/** Convert the editor rows into the exact payload `validateSchemaDefinition` accepts. */
export function fieldsToPayload(rows: AttributeFieldRow[]): AttributeFieldPayload[] {
  return rows.map((row, index) => {
    const constraints: Record<string, number | string | boolean | null> = {};
    // Each type only carries the constraints that type can enforce: a number field has
    // min/max, a text field has lengths and a pattern. Sending the other family's keys
    // would be guessing at semantics the validator does not apply.
    if (row.type === 'number') {
      for (const [name, raw] of [
        ['min', row.min],
        ['max', row.max],
      ] as const) {
        const value = optionalNumber(raw);
        if (value !== null) constraints[name] = value;
      }
    }
    if (row.type === 'text') {
      for (const [name, raw] of [
        ['minLength', row.minLength],
        ['maxLength', row.maxLength],
      ] as const) {
        const value = optionalNumber(raw);
        if (value !== null) constraints[name] = value;
      }
      if (row.pattern.trim()) constraints.pattern = row.pattern.trim();
    }

    const usesOptions = TYPES_WITH_OPTIONS.includes(row.type);
    const dependencyField = row.dependsOnField.trim();
    const inValues = row.dependsOnIn
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      key: row.key.trim().toLowerCase().replace(/\s+/g, '_'),
      type: row.type,
      labelEn: row.labelEn.trim(),
      unit: row.unit.trim() ? row.unit.trim() : null,
      required: row.required,
      filterable: row.filterable,
      publicDisplay: row.publicDisplay,
      adminOnly: row.adminOnly,
      order: index,
      options: usesOptions ? optionsFromText(row.optionsText) : [],
      constraints: TYPES_WITH_CONSTRAINTS.includes(row.type) ? constraints : {},
      dependsOn: dependencyField
        ? {
            field: dependencyField,
            ...(inValues.length > 0
              ? { in: inValues.map((value) => (Number.isFinite(Number(value)) ? Number(value) : value)) }
              : { equals: row.dependsOnEquals.trim() }),
          }
        : null,
    };
  });
}

/** Convert a stored field back into editor rows (so a draft can be reopened and edited). */
export function payloadToRows(
  fields: Array<{
    key: string;
    type: AttributeTypeName;
    labelEn: string;
    unit?: string | null;
    required: boolean;
    filterable: boolean;
    publicDisplay: boolean;
    adminOnly: boolean;
    options: AttributeOptionRow[];
    constraints?: Record<string, unknown>;
    dependsOn?: { field: string; equals?: unknown; in?: unknown } | null;
  }>,
): AttributeFieldRow[] {
  return fields.map((field) => {
    const constraints = field.constraints ?? {};
    const dependency = field.dependsOn ?? null;
    return {
      ...EMPTY_FIELD_ROW,
      key: field.key,
      type: field.type,
      labelEn: field.labelEn,
      unit: field.unit ?? '',
      required: field.required,
      filterable: field.filterable,
      publicDisplay: field.publicDisplay,
      adminOnly: field.adminOnly,
      min: constraints.min === undefined || constraints.min === null ? '' : String(constraints.min),
      max: constraints.max === undefined || constraints.max === null ? '' : String(constraints.max),
      minLength: constraints.minLength === undefined || constraints.minLength === null ? '' : String(constraints.minLength),
      maxLength: constraints.maxLength === undefined || constraints.maxLength === null ? '' : String(constraints.maxLength),
      pattern: typeof constraints.pattern === 'string' ? constraints.pattern : '',
      optionsText: optionsToText(field.options ?? []),
      dependsOnField: dependency?.field ?? '',
      dependsOnEquals:
        dependency && dependency.equals !== undefined && dependency.equals !== null ? String(dependency.equals) : '',
      dependsOnIn: Array.isArray(dependency?.in) ? dependency.in.map((value) => String(value)).join(', ') : '',
    };
  });
}

/** Move one entry of a list, returning a new array. Used by the media ordering controls. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}
