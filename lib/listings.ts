/**
 * Pure helpers for the Phase 05 listing screens.
 *
 * Everything here is free of React, the DOM and the network so the awkward parts — URL state,
 * category-dependent attribute visibility, autosave bookkeeping and the advertisement-language
 * rules — are unit-testable. None of it decides validity or authorization: the server re-checks
 * every value (`modules/listings/service.ts`), and these functions only shape what the operator
 * typed into the payload the API expects, and explain what the server said afterwards.
 */

import { localizedText, type UiLang } from './uiLocale.ts';

export { localizedText };

export type ListingMethod = 'auction' | 'fixed_price' | 'enquiry';
export type LanguageMode = 'en' | 'ar' | 'both';
export type ListingStatus = 'draft' | 'published' | 'archived';
export type Condition = 'new' | 'like_new' | 'used' | 'refurbished' | 'not_applicable';
export type Audience = 'men' | 'women';

export const AUDIENCES: Audience[] = ['men', 'women'];
export const LISTING_METHODS: ListingMethod[] = ['auction', 'fixed_price', 'enquiry'];
export const LANGUAGE_MODES: LanguageMode[] = ['en', 'ar', 'both'];
export const CONDITIONS: Condition[] = ['new', 'like_new', 'used', 'refurbished', 'not_applicable'];

export const METHOD_LABEL: Record<ListingMethod, string> = {
  auction: 'Auction',
  fixed_price: 'Fixed price',
  enquiry: 'Enquiry',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'New',
  like_new: 'Like new',
  used: 'Used',
  refurbished: 'Refurbished',
  not_applicable: 'Not applicable',
};

export const LANGUAGE_MODE_LABEL: Record<LanguageMode, string> = {
  en: 'English only',
  ar: 'Arabic only',
  both: 'English and Arabic',
};

export const AUDIENCE_LABEL: Record<Audience, string> = {
  men: 'Men',
  women: 'Women',
};

export type AttributeOption = { key: string; labelEn: string };

export type AttributeField = {
  key: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';
  labelEn: string;
  helpEn?: string | null;
  unit?: string | null;
  required: boolean;
  filterable: boolean;
  publicDisplay: boolean;
  adminOnly: boolean;
  order: number;
  options: AttributeOption[];
  constraints?: {
    min?: number | null;
    max?: number | null;
    integer?: boolean | null;
    minLength?: number | null;
    maxLength?: number | null;
    pattern?: string | null;
  };
  dependsOn?: { field: string; equals?: string | number | boolean | null; in?: Array<string | number> | null } | null;
};

export type LocalizedText = { en: string | null; ar: string | null };

/** Matches public GET /api/listings/:key when :key is a listing reference. */
const LISTING_REFERENCE_PATTERN = /^l_[A-Za-z0-9_-]{6,32}$/;

/** Matches public GET /api/listings/:key when :key is a published slug. */
const LISTING_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){0,16}$/;

/**
 * In-app product URL for cards and navigation.
 *
 * Uses `listingReference` so links keep working even when the API proxy or an older backend
 * only accepts references on mutating routes. Published slug URLs (`publicUrl`) still work when
 * opened directly; see `listingDetailApiPath`.
 */
export function productPath(listing: { listingReference: string }): string {
  return `/product/${listing.listingReference}`;
}

/** Path segment from a published `publicUrl` such as `/product/al-majlis-2`. */
export function productSlugFromPublicUrl(publicUrl: string): string | null {
  const match = /^\/product\/([^/?#]+)$/.exec(publicUrl.trim());
  return match?.[1] ?? null;
}

export function isListingRouteKey(value: string): boolean {
  const key = value.trim();
  return LISTING_REFERENCE_PATTERN.test(key) || LISTING_SLUG_PATTERN.test(key);
}

/** Public listing detail fetch path; accepts listing reference or published slug. */
export function listingDetailApiPath(routeKey: string): string | null {
  const key = routeKey.trim();
  if (!isListingRouteKey(key)) return null;
  return `/api/listings/${encodeURIComponent(key)}`;
}

export type PublicListing = {
  listingReference: string;
  publicUrl: string;
  languageMode: LanguageMode;
  title: LocalizedText;
  description: LocalizedText;
  listingMethod: ListingMethod;
  condition: Condition | null;
  audience: Audience | null;
  category: { key: string; path: string[] };
  attributes: Record<string, unknown>;
  location: {
    countryCode: string | null;
    cityKey: string | null;
    areaKey: string | null;
    label: string | null;
    publicPrecision: 'hidden' | 'city' | 'area' | 'exact';
  };
  media: Array<{
    assetId: string;
    position: number;
    isCover: boolean;
    width: number | null;
    height: number | null;
    alt: LocalizedText;
    url: string;
  }>;
  coverAssetId: string | null;
  seller: { sellerReference: string; displayName: string; verificationBadge: boolean };
  featured: boolean;
  priceMinor: number | null;
  availability: 'available' | 'sold';
  publishedAt: string | null;
  updatedAt: string;
  liveLotReference?: string | null;
  currentAmountMinor?: number | null;
  startingBidMinor?: number | null;
  bidCount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type AdminListingMediaEntry = {
  assetId: string;
  position: number;
  width: number | null;
  height: number | null;
  alt: LocalizedText;
  url: string | null;
  mediaStatus: string;
};

export type AdminListing = Omit<PublicListing, 'media'> & {
  status: ListingStatus;
  moderation: { state: 'ok' | 'pending_review' | 'blocked'; note: string | null };
  version: number;
  attributeSchemaVersion: number | null;
  mediaCollectionKey: string;
  media: AdminListingMediaEntry[];
  locationKey: string | null;
  adminNotes: string | null;
  createdBy: string;
  updatedBy: string | null;
  publishedBy: string | null;
  archivedBy: string | null;
  createdAt: string;
  archivedAt: string | null;
  archivedReason: string | null;
};

export type Reconciliation = {
  schemaVersion: number | null;
  kept: string[];
  cleared: string[];
  reason: string | null;
};

// ---------------------------------------------------------------------------
// Advertisement language
// ---------------------------------------------------------------------------

/** Which locales an advertisement must carry. This is content, not interface translation. */
export function requiredLocales(mode: LanguageMode): Array<'en' | 'ar'> {
  if (mode === 'both') return ['en', 'ar'];
  return [mode];
}

/**
 * Client-side completeness hint for the review step.
 *
 * The server is the authority (it enforces the same rule on publication), so this only exists
 * so the operator sees the gap before clicking publish. It never blocks a save.
 */
export function localizedProblems(input: {
  title: LocalizedText;
  description: LocalizedText;
  languageMode: LanguageMode;
}): string[] {
  const problems: string[] = [];
  for (const locale of requiredLocales(input.languageMode)) {
    const label = locale === 'en' ? 'English' : 'Arabic';
    const title = (input.title[locale] ?? '').trim();
    const description = (input.description[locale] ?? '').trim();
    if (title.length < 3) problems.push(`${label} title needs at least 3 characters`);
    else if (title.length > 140) problems.push(`${label} title is longer than 140 characters`);
    if (description.length < 10) problems.push(`${label} description needs at least 10 characters`);
  }
  return problems;
}

/** Conditions that make sense for a method. `enquiry` listings are not physical items. */
export function conditionOptionsFor(method: ListingMethod): Condition[] {
  if (method === 'enquiry') return ['not_applicable'];
  return ['new', 'like_new', 'used', 'refurbished'];
}

/** Category schema `item_condition` select values (hyphenated), distinct from listing `condition`. */
export type ItemCondition = 'new' | 'like-new' | 'used';

/**
 * Map listing Basics condition to the category attribute `item_condition` when the schema defines it.
 * Refurbished has no catalogue option; the closest valid value is used.
 */
export function mapListingConditionToItemCondition(condition: Condition | null | undefined): ItemCondition | null {
  switch (condition) {
    case 'new':
      return 'new';
    case 'like_new':
      return 'like-new';
    case 'used':
      return 'used';
    case 'refurbished':
      return 'used';
    default:
      return null;
  }
}

function attributeValueEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Before building the attribute save payload: copy Basics condition into `item_condition` when the
 * schema requires it and Category details left the field empty. An explicit Category value wins.
 */
export function withSyncedItemCondition(
  fields: AttributeField[],
  attributes: Record<string, unknown>,
  condition: Condition | null | undefined,
): Record<string, unknown> {
  const hasItemCondition = fields.some((field) => field.key === 'item_condition');
  if (!hasItemCondition) return { ...attributes };
  if (!attributeValueEmpty(attributes.item_condition)) return { ...attributes };
  const mapped = mapListingConditionToItemCondition(condition);
  if (mapped === null) return { ...attributes };
  return { ...attributes, item_condition: mapped };
}

// ---------------------------------------------------------------------------
// Category-dependent attributes
// ---------------------------------------------------------------------------

/**
 * Mirror of the server's dependency rule (`attributes/validate.ts → dependencySatisfied`).
 *
 * Used only to decide what to *show*. A hidden field is not submitted, and a value for a hidden
 * field is ignored by the server, so a client that disagrees with this cannot smuggle a value in.
 */
export function dependencySatisfied(field: AttributeField, values: Record<string, unknown>): boolean {
  const dependency = field.dependsOn;
  if (!dependency) return true;
  const current = values[dependency.field];
  if (dependency.equals !== undefined && dependency.equals !== null) {
    if (Array.isArray(current)) return current.includes(dependency.equals as never);
    return current === dependency.equals;
  }
  if (Array.isArray(dependency.in) && dependency.in.length > 0) {
    if (Array.isArray(current)) return current.some((value) => (dependency.in as Array<string | number>).includes(value as string | number));
    return (dependency.in as Array<string | number>).includes(current as string | number);
  }
  return false;
}

/** Fields to render, in schema order, with unsatisfied dependencies removed. */
export function visibleFields(fields: AttributeField[], values: Record<string, unknown>): AttributeField[] {
  return [...fields].sort((a, b) => a.order - b.order).filter((field) => dependencySatisfied(field, values));
}

/**
 * The attribute payload for a save: only keys the schema defines, and only values whose
 * dependency is currently satisfied. Keys the schema does not know are never invented here.
 */
export function attributePayload(fields: AttributeField[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!dependencySatisfied(field, values)) continue;
    const value = values[field.key];
    if (value === undefined || value === null || value === '') continue;
    if (field.type === 'number') {
      const parsed = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(parsed)) out[field.key] = parsed;
      continue;
    }
    if (field.type === 'boolean') {
      if (typeof value === 'boolean') out[field.key] = value;
      continue;
    }
    if (field.type === 'multiselect') {
      out[field.key] = Array.isArray(value) ? value.map((entry) => String(entry)) : [String(value)];
      continue;
    }
    out[field.key] = value;
  }
  return out;
}

/** Keys whose value the new schema no longer defines — the category change the wizard warns about. */
export function incompatibleAttributeKeys(fields: AttributeField[], values: Record<string, unknown>): string[] {
  const known = new Set(fields.map((field) => field.key));
  return Object.keys(values).filter((key) => !known.has(key));
}

/** One sentence an operator can act on, built from the server's reconciliation report. */
export function reconciliationSummary(reconciliation: Reconciliation | null): string | null {
  if (!reconciliation) return null;
  const kept = reconciliation.kept.length;
  const cleared = reconciliation.cleared.length;
  const reason = reconciliation.reason ? `${reconciliation.reason}. ` : '';
  if (cleared === 0) return `${reason}${kept} value${kept === 1 ? '' : 's'} carried over.`;
  return `${reason}${kept} value${kept === 1 ? '' : 's'} kept, and ${cleared} cleared: ${reconciliation.cleared.join(', ')}.`;
}

// ---------------------------------------------------------------------------
// Autosave
// ---------------------------------------------------------------------------

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed' | 'conflict';

/**
 * The autosave bookkeeping.
 *
 * `ticket` is the identity of the newest request. An outcome that does not match the newest
 * ticket is a stale response: it is ignored, so an older save can never overwrite newer work or
 * report its own success after a newer save failed. Nothing here claims "saved" unless the
 * server answered for the newest request.
 */
export type SaveTrack = {
  status: SaveStatus;
  ticket: number;
  /** The version the server last confirmed. */
  version: number;
  message: string | null;
};

export function initialSaveTrack(version: number): SaveTrack {
  return { status: 'idle', ticket: 0, version, message: null };
}

/** Local edits exist; the next save will describe them. */
export function markDirty(track: SaveTrack): SaveTrack {
  if (track.status === 'saving') return { ...track, message: track.message };
  return { ...track, status: 'dirty', message: null };
}

export function beginSave(track: SaveTrack): SaveTrack {
  return { ...track, status: 'saving', ticket: track.ticket + 1, message: null };
}

export type SaveOutcome =
  | { ok: true; version: number }
  | { ok: false; conflict: boolean; message: string; currentVersion?: number | null };

export function completeSave(track: SaveTrack, ticket: number, outcome: SaveOutcome): SaveTrack {
  if (ticket !== track.ticket) return track;
  if (outcome.ok) {
    return { status: 'saved', ticket, version: outcome.version, message: null };
  }
  return {
    status: outcome.conflict ? 'conflict' : 'failed',
    ticket,
    version: typeof outcome.currentVersion === 'number' ? outcome.currentVersion : track.version,
    message: outcome.message,
  };
}

/**
 * May a save response be written back over the form?
 *
 * Only when nothing was edited while that request was in flight. A response describes the document
 * as it was when the request was sent, so adopting it after a newer local edit would silently
 * discard that edit (an image attached while an earlier save was still running, for example). The
 * save itself is still recorded — the newer edit is what the next debounce sends.
 */
export function shouldAdoptServerForm(signatureAtStart: string, currentSignature: string): boolean {
  return signatureAtStart === currentSignature;
}

/** The state label the wizard shows. Never says "saved" unless the server said so. */
export function saveStatusText(track: SaveTrack): string {
  switch (track.status) {
    case 'saving':
      return 'Saving…';
    case 'saved':
      return 'Saved';
    case 'dirty':
      return 'Unsaved changes';
    case 'failed':
      return 'Save failed — your changes are still here, retry';
    case 'conflict':
      return 'Someone else changed this listing — reload before saving';
    default:
      return 'No changes yet';
  }
}

// ---------------------------------------------------------------------------
// Browse URL state
// ---------------------------------------------------------------------------

export type BrowseState = {
  q: string;
  audience: '' | Audience;
  category: string;
  method: '' | ListingMethod;
  condition: '' | Condition;
  city: string;
  featured: boolean;
  sort: 'recent' | 'title' | 'featured';
  page: number;
};

export const EMPTY_BROWSE: BrowseState = {
  q: '',
  audience: '',
  category: '',
  method: '',
  condition: '',
  city: '',
  featured: false,
  sort: 'recent',
  page: 1,
};

export const MAX_PAGE_SIZE = 48;

function firstValue(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  return value === null ? '' : value.trim();
}

/**
 * Read browse state from a URL.
 *
 * A malformed value is dropped rather than guessed at (an unknown sort becomes the default, an
 * out-of-range page becomes page 1), so a hand-edited or truncated URL still renders a real page
 * instead of an error, and the canonical URL the page then writes back is always valid.
 */
export function parseBrowseState(params: URLSearchParams): BrowseState {
  const q = firstValue(params, 'q').slice(0, 120);
  const audienceRaw = firstValue(params, 'audience').toLowerCase();
  const category = firstValue(params, 'category').toLowerCase();
  const method = firstValue(params, 'method');
  const condition = firstValue(params, 'condition');
  const city = firstValue(params, 'city').toLowerCase();
  const featured = firstValue(params, 'featured') === 'true';
  const sort = firstValue(params, 'sort');
  const page = Number.parseInt(firstValue(params, 'page'), 10);
  return {
    q,
    audience: (AUDIENCES as string[]).includes(audienceRaw) ? (audienceRaw as Audience) : '',
    category: /^[a-z][a-z0-9-]{1,59}$/.test(category) ? category : '',
    method: (LISTING_METHODS as string[]).includes(method) ? (method as ListingMethod) : '',
    condition: (CONDITIONS as string[]).includes(condition) ? (condition as Condition) : '',
    city: /^[a-z][a-z0-9-]{1,59}$/.test(city) ? city : '',
    featured,
    sort: sort === 'title' || sort === 'featured' ? sort : 'recent',
    page: Number.isFinite(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

/** Canonical query string: only non-default values, in a stable order. */
export function browseQuery(state: BrowseState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.audience) params.set('audience', state.audience);
  if (state.category) params.set('category', state.category);
  if (state.method) params.set('method', state.method);
  if (state.condition) params.set('condition', state.condition);
  if (state.city) params.set('city', state.city);
  if (state.featured) params.set('featured', 'true');
  if (state.sort !== 'recent') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  return params.toString();
}

/**
 * Apply a filter change. Any change other than paging resets to page 1: keeping the old page
 * number after narrowing the result set is how a visitor lands on an empty page 4 and concludes
 * the marketplace is empty.
 */
export function applyBrowseChange(state: BrowseState, change: Partial<BrowseState>): BrowseState {
  const next = { ...state, ...change };
  const onlyPageChanged =
    change.page !== undefined &&
    change.q === undefined &&
    change.audience === undefined &&
    change.category === undefined &&
    change.method === undefined &&
    change.condition === undefined &&
    change.city === undefined &&
    change.featured === undefined &&
    change.sort === undefined;
  if (!onlyPageChanged) next.page = 1;
  return next;
}

export function browseIsFiltered(state: BrowseState): boolean {
  return Boolean(state.q || state.audience || state.category || state.method || state.condition || state.city || state.featured);
}

// ---------------------------------------------------------------------------
// Media ordering
// ---------------------------------------------------------------------------

export type OrderedMedia = { assetId: string; alt: LocalizedText };

/** Move one entry, returning a new array. Positions are recomputed by the caller from the order. */
export function moveMedia<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

/**
 * The cover after a change to the media list: a chosen cover that is still attached survives,
 * otherwise the first image becomes the cover, and an empty list has none.
 */
export function coverAfterChange(media: OrderedMedia[], requested: string | null): string | null {
  if (media.length === 0) return null;
  if (requested && media.some((entry) => entry.assetId === requested)) return requested;
  return media[0]?.assetId ?? null;
}

/** The media payload the API expects (order is the array order; no URLs are ever sent). */
export function mediaPayload(media: OrderedMedia[]): Array<{ assetId: string; alt: LocalizedText }> {
  return media.map((entry) => ({
    assetId: entry.assetId,
    alt: { en: entry.alt.en?.trim() || null, ar: entry.alt.ar?.trim() || null },
  }));
}

/** A public image URL, absolute so it works from the Next.js dev server too. */
export function mediaUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path}`;
}

/** Cards need one image: the cover, or the first attached image, or nothing. */
export function coverImage(listing: { coverAssetId: string | null; media: Array<{ assetId: string; url: string }> }): string | null {
  const cover = listing.media.find((entry) => entry.assetId === listing.coverAssetId);
  return cover?.url ?? listing.media[0]?.url ?? null;
}

/**
 * Public listing cards always show the title in caps (a no-op for Arabic script). With `lang` 'ar'
 * the Arabic title is preferred when present; otherwise the English title is used.
 */
export function listingCardTitle(
  listing: { title: LocalizedText; listingReference?: string },
  lang: UiLang = 'en',
): string {
  const raw = localizedText(listing.title, lang, listing.listingReference ?? 'Untitled listing');
  return raw.toUpperCase();
}

/**
 * Amount shown on catalogue cards. Auctions use starting bid only (never current bid);
 * fixed-price listings use the published price.
 */
export function listingCardPrice(listing: {
  listingMethod: ListingMethod;
  priceMinor: number | null;
  startingBidMinor?: number | null;
}): { minor: number; kind: 'starting' | 'price' } | null {
  if (listing.listingMethod === 'auction') {
    if (typeof listing.startingBidMinor === 'number') return { minor: listing.startingBidMinor, kind: 'starting' };
    return null;
  }
  if (listing.listingMethod === 'fixed_price' && typeof listing.priceMinor === 'number') {
    return { minor: listing.priceMinor, kind: 'price' };
  }
  return null;
}

/** Human label for a method/condition pair without inventing a price or a bid. */
export function listingBadgeText(listing: { listingMethod: ListingMethod; condition: Condition | null }): string {
  const method = METHOD_LABEL[listing.listingMethod];
  if (!listing.condition) return method;
  return `${method} · ${CONDITION_LABEL[listing.condition]}`;
}
