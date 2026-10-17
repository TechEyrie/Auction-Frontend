/**
 * Operator-facing copy for listing validation refusals from the API.
 *
 * Maps raw `fieldErrors` paths and codes into English labels and short messages
 * used in banners, inline field hints, and pre-publish checklists.
 */

import { ApiRequestError } from './api.ts';
import type { AttributeField } from './listings.ts';
import { fieldError } from './admin.ts';

export type ListingFieldErrorContext = {
  schemaFields?: AttributeField[];
};

export type ListingEditorSection = 'basics' | 'content' | 'attributes' | 'media' | 'review';

const SECTION_LABEL: Record<ListingEditorSection, string> = {
  basics: 'Basics',
  content: 'The ad',
  attributes: 'Category details',
  media: 'Photos',
  review: 'Publish',
};

const LISTING_FIELD_LABEL: Record<string, string> = {
  sellerReference: 'Seller',
  categoryKey: 'Category',
  audience: 'Audience',
  listingMethod: 'Listing method',
  languageMode: 'Advertisement language',
  condition: 'Item condition (basics)',
  locationKey: 'Location',
  priceMinor: 'Price',
  media: 'Photos',
  coverAssetId: 'Cover image',
  attributes: 'Category details',
  featured: 'Featured',
  adminNotes: 'Admin notes',
};

function humanizeKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** English label for a listing field path (e.g. `attributes.item_condition`). */
export function listingFieldLabel(path: string, ctx: ListingFieldErrorContext = {}): string {
  const attributeMatch = /^attributes\.(.+)$/.exec(path);
  if (attributeMatch) {
    const attrKey = attributeMatch[1]!;
    const field = ctx.schemaFields?.find((entry) => entry.key === attrKey);
    if (field?.labelEn?.trim()) return field.labelEn.trim();
    return humanizeKey(attrKey);
  }

  const localized = /^(title|description)\.(en|ar)$/.exec(path);
  if (localized) {
    const [, field, locale] = localized;
    const localeLabel = locale === 'en' ? 'English' : 'Arabic';
    return field === 'title' ? `Title (${localeLabel})` : `Description (${localeLabel})`;
  }

  return LISTING_FIELD_LABEL[path] ?? humanizeKey(path);
}

/** Wizard / modal section that owns a field path. */
export function listingFieldSection(path: string): ListingEditorSection {
  if (path.startsWith('attributes.') || path === 'attributes') return 'attributes';
  if (path.startsWith('title.') || path.startsWith('description.') || path === 'languageMode') return 'content';
  if (path === 'media' || path === 'coverAssetId') return 'media';
  if (path === 'sellerReference' || path === 'categoryKey' || path === 'audience' || path === 'listingMethod' || path === 'condition' || path === 'locationKey' || path === 'priceMinor') {
    return 'basics';
  }
  return 'review';
}

const SECTION_ORDER: ListingEditorSection[] = ['basics', 'content', 'attributes', 'media', 'review'];

/** First section (in wizard order) that contains a validation error. */
export function firstListingErrorSection(fieldErrors: Record<string, string>): ListingEditorSection | null {
  const sections = new Set(Object.keys(fieldErrors).map(listingFieldSection));
  for (const section of SECTION_ORDER) {
    if (sections.has(section)) return section;
  }
  return null;
}

function isRequiredMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return lower === 'required' || lower.startsWith('required ');
}

/**
 * Turn one API field error into operator copy.
 */
export function formatListingFieldError(
  path: string,
  codeOrMessage: string,
  ctx: ListingFieldErrorContext = {},
): { inline: string; summary: string; section: ListingEditorSection; sectionLabel: string; label: string } {
  const label = listingFieldLabel(path, ctx);
  const section = listingFieldSection(path);
  const sectionLabel = SECTION_LABEL[section];
  const message = codeOrMessage.trim();

  if (isRequiredMessage(message)) {
    const inline = 'Required';
    const summary =
      section === 'attributes'
        ? `${sectionLabel} → ${label} is required before publishing.`
        : `${label} (${sectionLabel.toLowerCase()}) is required before publishing.`;
    return { inline, summary, section, sectionLabel, label };
  }

  if (message === 'unknown attribute for this category') {
    return {
      inline: 'Not valid for this category',
      summary: `${label} is not valid for this category.`,
      section,
      sectionLabel,
      label,
    };
  }

  const inline = message.charAt(0).toUpperCase() + message.slice(1);
  const summary = section === 'attributes' ? `${sectionLabel} → ${label}: ${message}` : `${label} (${sectionLabel.toLowerCase()}): ${message}`;
  return { inline, summary, section, sectionLabel, label };
}

export function listingFieldInlineMessage(
  errors: Record<string, string> | undefined,
  path: string,
  ctx: ListingFieldErrorContext = {},
): string | null {
  const raw = fieldError(errors, path);
  if (!raw) return null;
  return formatListingFieldError(path, raw, ctx).inline;
}

export type ListingValidationAlert = {
  headline: string;
  items: string[];
};

export function listingValidationFromApiError(
  err: unknown,
  ctx: ListingFieldErrorContext = {},
  options?: { publishAttempt?: boolean },
): ListingValidationAlert | null {
  if (!(err instanceof ApiRequestError)) return null;
  const entries = Object.entries(err.body.fieldErrors);
  if (entries.length === 0) return null;

  const items = entries.map(([path, code]) => formatListingFieldError(path, code, ctx).summary);
  const headline =
    options?.publishAttempt === true
      ? 'Cannot publish yet'
      : err.body.message?.trim() || 'Please fix the following before continuing';

  return { headline, items };
}

export function listingApiErrorMessage(
  err: unknown,
  ctx: ListingFieldErrorContext = {},
  options?: { publishAttempt?: boolean },
): string {
  const structured = listingValidationFromApiError(err, ctx, options);
  if (structured) {
    if (structured.items.length === 1) return `${structured.headline}: ${structured.items[0]}`;
    return `${structured.headline}: ${structured.items.join(' · ')}`;
  }
  if (err instanceof ApiRequestError) return err.body.message || err.message;
  return err instanceof Error ? err.message : String(err);
}

export type ListingFailureState = {
  fieldErrors: Record<string, string>;
  validationAlert: ListingValidationAlert | null;
  message: string | null;
};

/** Normalize a listing save/publish API failure for form state. */
export function listingFailureState(
  err: unknown,
  ctx: ListingFieldErrorContext = {},
  options?: { publishAttempt?: boolean },
): ListingFailureState {
  const structured = listingValidationFromApiError(err, ctx, options);
  if (structured && err instanceof ApiRequestError) {
    return { fieldErrors: err.body.fieldErrors, validationAlert: structured, message: null };
  }
  return {
    fieldErrors: {},
    validationAlert: null,
    message: listingApiErrorMessage(err, ctx, options),
  };
}

/** Labels for required category attributes (matches server publish checks). */
export function missingRequiredAttributeLabels(
  visible: AttributeField[],
  attributes: Record<string, unknown>,
): string[] {
  return visible
    .filter(
      (entry) =>
        entry.required &&
        (attributes[entry.key] === undefined || attributes[entry.key] === null || attributes[entry.key] === ''),
    )
    .map((entry) => entry.labelEn.trim() || humanizeKey(entry.key));
}

const MODAL_FIELD_ID: Record<string, string> = {
  audience: 'pe-audience',
  categoryKey: 'pe-category',
  listingMethod: 'pe-method',
  priceMinor: 'pe-price',
  languageMode: 'pe-language',
  condition: 'pe-condition',
  locationKey: 'pe-location',
  'title.en': 'pe-title-en',
  'title.ar': 'pe-title-ar',
  'description.en': 'pe-desc-en',
  'description.ar': 'pe-desc-ar',
};

const WIZARD_FIELD_ID: Record<string, string> = {
  audience: 'w-audience',
  categoryKey: 'w-category',
  listingMethod: 'w-method',
  priceMinor: 'w-price',
  languageMode: 'w-language',
  condition: 'w-condition',
  locationKey: 'w-location',
  'title.en': 'title-en',
  'title.ar': 'title-ar',
  'description.en': 'description-en',
  'description.ar': 'description-ar',
};

/** DOM id of the control to focus after a validation failure, when one exists. */
export function listingFieldFocusId(path: string, surface: 'modal' | 'wizard'): string | null {
  const map = surface === 'modal' ? MODAL_FIELD_ID : WIZARD_FIELD_ID;
  if (map[path]) return map[path]!;
  const attributeMatch = /^attributes\.(.+)$/.exec(path);
  if (attributeMatch) {
    const key = attributeMatch[1]!;
    return surface === 'modal' ? `pe-attr-${key}` : `attr-${key}`;
  }
  return null;
}

/** First field path in wizard section order (for focus). */
export function firstListingErrorPath(fieldErrors: Record<string, string>): string | null {
  for (const section of SECTION_ORDER) {
    const path = Object.keys(fieldErrors).find((entry) => listingFieldSection(entry) === section);
    if (path) return path;
  }
  return null;
}
