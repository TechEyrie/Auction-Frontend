'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { formatBytes } from '../../../lib/admin';
import {
  attributePayload,
  AUDIENCE_LABEL,
  AUDIENCES,
  CONDITION_LABEL,
  conditionOptionsFor,
  coverAfterChange,
  LANGUAGE_MODE_LABEL,
  LANGUAGE_MODES,
  LISTING_METHODS,
  METHOD_LABEL,
  localizedProblems,
  mediaPayload,
  moveMedia,
  requiredLocales,
  visibleFields,
  type AdminListing,
  type AttributeField,
  type Audience,
  type Condition,
  type LanguageMode,
  type ListingMethod,
  type LocalizedText,
} from '../../../lib/listings';
import type { SessionValue } from '../../../lib/session';
import { Badge, ErrorNote, GhostButton, Hint, Label, Modal, PrimaryButton, Toggle } from '../ui';
import './listings.css';

type Category = { key: string; name: string; parentKey: string | null; depth: number; listingMethods: ListingMethod[] };
type LocationOption = {
  key: string;
  cityKey: string;
  active?: boolean;
  /** Public DTO shape */
  label?: string;
  /** Admin list returns raw docs with nested labels */
  labels?: { en?: string; ar?: string | null };
};

function locationLabel(location: LocationOption): string {
  return location.label?.trim() || location.labels?.en?.trim() || location.key;
}
type SellerOption = { sellerReference: string; displayName: string; status: string };
type Asset = {
  assetId: string;
  status: 'staging' | 'ready' | 'rejected' | 'failed';
  bytes: number;
  image: { width: number; height: number } | null;
  mime: string | null;
  statusReason: string | null;
  url: string | null;
};

type EditorForm = {
  sellerReference: string;
  categoryKey: string;
  audience: Audience | '';
  listingMethod: ListingMethod;
  languageMode: LanguageMode;
  condition: Condition | null;
  locationKey: string | null;
  title: LocalizedText;
  description: LocalizedText;
  attributes: Record<string, unknown>;
  media: Array<{ assetId: string; alt: LocalizedText }>;
  coverAssetId: string | null;
  featured: boolean;
  adminNotes: string;
  priceQar: string;
};

function emptyForm(): EditorForm {
  return {
    sellerReference: '',
    categoryKey: '',
    audience: '',
    listingMethod: 'fixed_price',
    languageMode: 'en',
    condition: 'used',
    locationKey: null,
    title: { en: null, ar: null },
    description: { en: null, ar: null },
    attributes: {},
    media: [],
    coverAssetId: null,
    featured: false,
    adminNotes: '',
    priceQar: '',
  };
}

function priceMinorFromForm(form: EditorForm): number | null {
  if (form.listingMethod !== 'fixed_price') return null;
  const raw = form.priceQar.trim();
  if (!raw) return null;
  const qar = Number(raw);
  if (!Number.isFinite(qar) || qar <= 0) return null;
  return Math.round(qar * 100);
}

function assertFormReady(form: EditorForm): void {
  if (!form.categoryKey || !form.audience) {
    throw new Error('Choose audience (Men or Women) and category before saving or uploading photos.');
  }
  if (form.listingMethod === 'fixed_price' && priceMinorFromForm(form) === null) {
    throw new Error('Enter a price in QAR for fixed-price listings (or switch Listing method to Auction).');
  }
}

function formFromListing(listing: AdminListing): EditorForm {
  return {
    sellerReference: listing.seller.sellerReference,
    categoryKey: listing.category.key,
    audience: listing.audience ?? '',
    listingMethod: listing.listingMethod,
    languageMode: listing.languageMode,
    condition: listing.condition,
    locationKey: listing.locationKey,
    title: { en: listing.title.en, ar: listing.title.ar },
    description: { en: listing.description.en, ar: listing.description.ar },
    attributes: { ...listing.attributes },
    media: listing.media.map((entry) => ({ assetId: entry.assetId, alt: { en: entry.alt.en, ar: entry.alt.ar } })),
    coverAssetId: listing.coverAssetId,
    featured: listing.featured,
    adminNotes: listing.adminNotes ?? '',
    priceQar: listing.priceMinor ? String(listing.priceMinor / 100) : '',
  };
}

function payloadOf(form: EditorForm, fields: AttributeField[]): Record<string, unknown> {
  return {
    sellerReference: form.sellerReference || undefined,
    categoryKey: form.categoryKey,
    audience: form.audience || null,
    listingMethod: form.listingMethod,
    languageMode: form.languageMode,
    condition: form.condition,
    locationKey: form.locationKey,
    title: { en: form.title.en, ar: form.title.ar },
    description: { en: form.description.en, ar: form.description.ar },
    attributes: attributePayload(fields, form.attributes),
    media: mediaPayload(form.media),
    coverAssetId: form.coverAssetId,
    featured: form.featured,
    adminNotes: form.adminNotes.trim() ? form.adminNotes.trim() : null,
    // Always send priceMinor so switching auction ↔ fixed-price clears or sets the server value.
    priceMinor: priceMinorFromForm(form),
  };
}

function apiMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const fields = Object.entries(err.body.fieldErrors);
    return fields.length > 0 ? `${err.message} (${fields.map(([key, value]) => `${key}: ${value}`).join('; ')})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function ProductEditorModal({
  open,
  mode,
  listingReference,
  categories,
  locations,
  sellers,
  session,
  mayManage,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'add' | 'edit';
  listingReference: string | null;
  categories: Category[];
  locations: LocationOption[];
  sellers: SellerOption[];
  session: SessionValue;
  mayManage: boolean;
  onClose: () => void;
  onSaved: (listing: AdminListing) => void;
}) {
  const [form, setForm] = useState<EditorForm>(emptyForm());
  const formRef = useRef(form);
  formRef.current = form;

  const [ref, setRef] = useState<string | null>(listingReference);
  const [version, setVersion] = useState(0);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [schemaFields, setSchemaFields] = useState<AttributeField[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const loadAssets = useCallback(async (listingRef: string) => {
    const response = await apiFetch<{ assets: Asset[] }>(
      `/api/admin/media?collectionKey=${encodeURIComponent(`listing_${listingRef}`)}`,
      { cache: 'no-store' },
    );
    setAssets(response.assets);
  }, []);

  const loadSchema = useCallback(async (categoryKey: string) => {
    if (!categoryKey) {
      setSchemaFields([]);
      return;
    }
    try {
      const response = await apiFetch<{ schemas: Array<{ version: number; status: string; fields: AttributeField[] }> }>(
        `/api/admin/attribute-schemas?categoryKey=${encodeURIComponent(categoryKey)}`,
        { cache: 'no-store' },
      );
      const published = response.schemas.find((entry) => entry.status === 'published') ?? null;
      setSchemaFields(published?.fields ?? []);
    } catch {
      setSchemaFields([]);
    }
  }, []);

  const hydrateEdit = useCallback(async (listingRef: string) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ listing: AdminListing; schema: { version: number; fields: AttributeField[] } | null }>(
        `/api/admin/listings/${encodeURIComponent(listingRef)}`,
        { cache: 'no-store' },
      );
      setListing(response.listing);
      setRef(response.listing.listingReference);
      setVersion(response.listing.version);
      setForm(formFromListing(response.listing));
      setSchemaFields(response.schema?.fields ?? []);
      await loadAssets(response.listing.listingReference);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadAssets]);

  // Reset / hydrate only when the dialog opens or the target listing changes — never on
  // every keystroke (unstable callback deps would wipe the form and steal focus).
  useEffect(() => {
    if (!open) return;
    setConfirmPublish(false);
    setError(null);
    setNotice(null);
    setProgress(null);
    if (mode === 'edit' && listingReference) {
      void hydrateEdit(listingReference);
      return;
    }
    setRef(null);
    setListing(null);
    setVersion(0);
    setAssets([]);
    setSchemaFields([]);
    setForm(emptyForm());
    setLoading(false);
    // intentionally omit hydrateEdit — it is stable enough and listingReference drives reloads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, listingReference]);

  const category = categories.find((entry) => entry.key === form.categoryKey);
  const methods = category?.listingMethods.length ? category.listingMethods : LISTING_METHODS;
  const conditions = conditionOptionsFor(form.listingMethod);
  const locales = requiredLocales(form.languageMode);
  const visible = visibleFields(schemaFields, form.attributes);
  const problems = localizedProblems({ title: form.title, description: form.description, languageMode: form.languageMode });
  // Category details UI is hidden for now — do not block publish on schema fields.
  const missingRequired: string[] = [];
  void visible;
  const readyAssets = useMemo(() => assets.filter((asset) => asset.status === 'ready'), [assets]);

  async function ensureDraft(): Promise<{ listingReference: string; version: number }> {
    const current = formRef.current;
    assertFormReady(current);
    const sellerReference =
      current.sellerReference ||
      sellers.find((seller) => seller.status === 'active')?.sellerReference ||
      sellers[0]?.sellerReference ||
      '';
    if (!sellerReference) {
      throw new Error('No seller record exists yet. Seed or create one, then try again.');
    }

    let listingReference = ref;
    let expectedVersion = version;
    const withSeller = { ...current, sellerReference };

    if (!listingReference) {
      // Create with the form's listing method — never let the category default silently become
      // fixed_price without a price (that is what broke photo upload after switching to auction).
      const created = await apiFetch<{ listing: AdminListing }>('/api/admin/listings', {
        method: 'POST',
        json: {
          sellerReference,
          categoryKey: current.categoryKey,
          listingMethod: current.listingMethod,
          audience: current.audience || null,
          languageMode: current.languageMode,
          condition: current.condition,
          priceMinor: priceMinorFromForm(current),
        },
        headers: session.authHeaders(),
      });
      listingReference = created.listing.listingReference;
      expectedVersion = created.listing.version;
      setRef(listingReference);
      setForm((prev) => ({ ...prev, sellerReference }));
      formRef.current = { ...formRef.current, sellerReference };
    }

    const patched = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${listingReference}`, {
      method: 'PATCH',
      json: {
        ...payloadOf(formRef.current.sellerReference ? formRef.current : withSeller, schemaFields),
        expectedVersion,
      },
      headers: session.authHeaders(),
    });
    setVersion(patched.listing.version);
    setListing(patched.listing);
    return { listingReference: patched.listing.listingReference, version: patched.listing.version };
  }

  async function saveAll(): Promise<AdminListing> {
    const ensured = await ensureDraft();
    const response = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${ensured.listingReference}`, {
      method: 'PATCH',
      json: { ...payloadOf(formRef.current, schemaFields), expectedVersion: ensured.version },
      headers: session.authHeaders(),
    });
    setVersion(response.listing.version);
    setListing(response.listing);
    setForm(formFromListing(response.listing));
    formRef.current = formFromListing(response.listing);
    await loadAssets(ensured.listingReference);
    return response.listing;
  }

  async function handleSave(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveAll();
      setNotice('Product saved.');
      onSaved(saved);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveAll();
      const published = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${saved.listingReference}/publish`, {
        method: 'POST',
        json: { expectedVersion: saved.version },
        headers: session.authHeaders(),
      });
      setListing(published.listing);
      setVersion(published.listing.version);
      setForm(formFromListing(published.listing));
      setNotice('Product published.');
      setConfirmPublish(false);
      onSaved(published.listing);
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const ensured = await ensureDraft();
      setProgress(0);
      await new Promise<void>((resolve) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${API_BASE_URL}/api/admin/media/upload`);
        request.withCredentials = true;
        request.setRequestHeader('content-type', file.type || 'application/octet-stream');
        request.setRequestHeader('x-collection-key', `listing_${ensured.listingReference}`);
        for (const [name, value] of Object.entries(session.authHeaders())) request.setRequestHeader(name, value);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => {
          setProgress(null);
          if (request.status === 201) {
            const body = JSON.parse(request.responseText) as { asset: { assetId: string } };
            const current = formRef.current;
            const media = [...current.media, { assetId: body.asset.assetId, alt: { en: null, ar: null } }];
            const next = { ...current, media, coverAssetId: coverAfterChange(media, current.coverAssetId) };
            setForm(next);
            formRef.current = next;
            void loadAssets(ensured.listingReference);
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
          setProgress(null);
          setError('The upload could not reach the server.');
          resolve();
        };
        request.send(file);
      });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function chooseCategory(categoryKey: string): void {
    const cat = categories.find((entry) => entry.key === categoryKey);
    const listingMethod = cat?.listingMethods.includes(form.listingMethod)
      ? form.listingMethod
      : (cat?.listingMethods[0] ?? form.listingMethod);
    const condition = conditionOptionsFor(listingMethod).includes(form.condition as Condition)
      ? form.condition
      : conditionOptionsFor(listingMethod)[0];
    setForm({ ...form, categoryKey, listingMethod, condition, attributes: {} });
    void loadSchema(categoryKey);
  }

  const title = mode === 'add' ? (ref ? 'Add product' : 'Add product') : 'Edit product';
  const subtitle = ref
    ? `${listing?.status ?? 'draft'} · ${METHOD_LABEL[form.listingMethod]}${listing?.publicUrl ? ` · ${listing.publicUrl}` : ''}`
    : 'Fill in everything here — basics, copy, details, photos, then save or publish.';

  const canPublish =
    mayManage &&
    listing &&
    listing.status !== 'published' &&
    listing.status !== 'archived' &&
    problems.length === 0 &&
    form.media.length > 0 &&
    missingRequired.length === 0;

  return (
    <Modal
      open={open}
      onClose={() => !busy && !loading && onClose()}
      title={title}
      subtitle={subtitle}
      size="xl"
      footer={
        <>
          <GhostButton type="button" disabled={busy || loading} onClick={onClose}>
            Close
          </GhostButton>
          <div style={css('display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto')}>
            {mayManage && listing && listing.status !== 'published' && listing.status !== 'archived' ? (
              <PrimaryButton type="button" disabled={busy || loading || !confirmPublish || !canPublish} onClick={() => void handlePublish()}>
                {busy ? 'Working…' : 'Publish'}
              </PrimaryButton>
            ) : null}
            <PrimaryButton type="button" disabled={busy || loading || !mayManage} onClick={() => void handleSave()}>
              {busy ? 'Saving…' : ref ? 'Save product' : 'Create & save'}
            </PrimaryButton>
          </div>
        </>
      }
    >
      {loading ? (
        <p role="status" className="adm-state" data-state="loading">
          Loading product…
        </p>
      ) : (
        <form className="adm-form adm-form--modal" onSubmit={(event) => void handleSave(event)}>
          <ErrorNote>{error}</ErrorNote>
          {notice ? (
            <p className="adm-note" data-tone="good" style={css('margin: 0')}>
              {notice}
            </p>
          ) : null}

          <section className="adm-section">
            <h3>Basics</h3>
            <p className="adm-section-hint">Audience, category, listing type, condition and location.</p>
            <div className="adm-grid adm-grid--2">
              <div>
                <Label htmlFor="pe-audience">Audience</Label>
                <select
                  id="pe-audience"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.audience}
                  onChange={(event) => setForm({ ...form, audience: event.target.value as Audience | '' })}
                >
                  <option value="">Choose Men or Women…</option>
                  {AUDIENCES.map((entry) => (
                    <option key={entry} value={entry}>
                      {AUDIENCE_LABEL[entry]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pe-category">Category</Label>
                <select
                  id="pe-category"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.categoryKey}
                  onChange={(event) => chooseCategory(event.target.value)}
                >
                  <option value="">Choose category…</option>
                  {categories.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {'—'.repeat(entry.depth + 1)} {entry.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pe-method">Listing method</Label>
                <select
                  id="pe-method"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.listingMethod}
            onChange={(event) => {
              const listingMethod = event.target.value as ListingMethod;
              setForm({
                ...form,
                listingMethod,
                condition: conditionOptionsFor(listingMethod)[0],
                // Clear stale fixed price when leaving buy-now so auction saves do not revive it.
                priceQar: listingMethod === 'fixed_price' ? form.priceQar : '',
              });
            }}
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABEL[method]}
              </option>
            ))}
          </select>
          <Hint>Auction needs no price here — the auction engine sets bidding later. Fixed price requires a QAR amount.</Hint>
        </div>
        {form.listingMethod === 'fixed_price' ? (
          <div>
            <Label htmlFor="pe-price">Price (QAR)</Label>
            <input
              id="pe-price"
              className="field"
              type="number"
              min={1}
              step="0.01"
              disabled={busy || !mayManage}
              value={form.priceQar}
              onChange={(event) => setForm({ ...form, priceQar: event.target.value })}
              placeholder="e.g. 450"
              required
            />
          </div>
        ) : null}
              <div>
                <Label htmlFor="pe-language">Advertisement language</Label>
                <select
                  id="pe-language"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.languageMode}
                  onChange={(event) => setForm({ ...form, languageMode: event.target.value as LanguageMode })}
                >
                  {LANGUAGE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {LANGUAGE_MODE_LABEL[mode]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pe-condition">Condition</Label>
                <select
                  id="pe-condition"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.condition ?? ''}
                  onChange={(event) => setForm({ ...form, condition: event.target.value as Condition })}
                >
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {CONDITION_LABEL[condition]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pe-location">Location</Label>
                <select
                  id="pe-location"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.locationKey ?? ''}
                  onChange={(event) => setForm({ ...form, locationKey: event.target.value || null })}
                >
                  <option value="">Not set</option>
                  {locations
                    .filter((loc) => loc.active !== false)
                    .map((loc) => (
                      <option key={loc.key} value={loc.key}>
                        {locationLabel(loc)}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          <section className="adm-section">
            <h3>The ad</h3>
            <p className="adm-section-hint">Titles and descriptions shoppers see. Required languages follow the advertisement language above.</p>
            {locales.includes('en') ? (
              <div>
                <Label htmlFor="pe-title-en">Title (English)</Label>
                <input
                  id="pe-title-en"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.title.en ?? ''}
                  onChange={(event) => setForm({ ...form, title: { ...form.title, en: event.target.value || null } })}
                />
              </div>
            ) : null}
            {locales.includes('ar') ? (
              <div>
                <Label htmlFor="pe-title-ar">Title (Arabic)</Label>
                <input
                  id="pe-title-ar"
                  className="field"
                  dir="rtl"
                  disabled={busy || !mayManage}
                  value={form.title.ar ?? ''}
                  onChange={(event) => setForm({ ...form, title: { ...form.title, ar: event.target.value || null } })}
                />
              </div>
            ) : null}
            {locales.includes('en') ? (
              <div>
                <Label htmlFor="pe-desc-en">Description (English)</Label>
                <textarea
                  id="pe-desc-en"
                  className="field"
                  rows={4}
                  disabled={busy || !mayManage}
                  value={form.description.en ?? ''}
                  onChange={(event) => setForm({ ...form, description: { ...form.description, en: event.target.value || null } })}
                />
              </div>
            ) : null}
            {locales.includes('ar') ? (
              <div>
                <Label htmlFor="pe-desc-ar">Description (Arabic)</Label>
                <textarea
                  id="pe-desc-ar"
                  className="field"
                  rows={4}
                  dir="rtl"
                  disabled={busy || !mayManage}
                  value={form.description.ar ?? ''}
                  onChange={(event) => setForm({ ...form, description: { ...form.description, ar: event.target.value || null } })}
                />
              </div>
            ) : null}
          </section>

          {/* Category details hidden for now — restore when attribute schemas are operator-facing.
          <section className="adm-section">
            <h3>Category details</h3>
            <p className="adm-section-hint">
              {form.categoryKey
                ? schemaFields.length > 0
                  ? 'Structured fields from this category’s published schema.'
                  : 'This category has no published attribute schema yet.'
                : 'Choose a category to load its detail fields.'}
            </p>
            ...attribute fields...
          </section>
          */}

          <section className="adm-section">
            <h3>Photos</h3>
            <p className="adm-section-hint">
              Upload JPEG, PNG or WebP. Choose a cover, reorder, and add alt text. At least one photo is required to publish.
              {!ref ? ' Saving or uploading will create the draft first.' : ''}
            </p>
            <div className="lw-media-step">
              <label className={mayManage && !busy ? 'lw-upload-zone' : 'lw-upload-zone lw-upload-zone--disabled'}>
                <p className="lw-upload-zone__title">Drop an image here or click to upload</p>
                <p className="lw-upload-zone__hint">
                  One file per upload. The server verifies the file and strips metadata.
                  {progress !== null ? ` · Uploading ${progress}%` : ''}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="lw-upload-zone__input"
                  disabled={busy || !mayManage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void upload(file);
                  }}
                />
              </label>

              {form.media.length === 0 ? (
                <p className="lw-media-empty">No images yet. Upload at least one to publish.</p>
              ) : (
                <div className="lw-media-grid">
                  {form.media.map((entry, index) => {
                    const asset = readyAssets.find((item) => item.assetId === entry.assetId);
                    return (
                      <figure key={entry.assetId} className="lw-media-card">
                        <div className="lw-media-card__preview">
                          {asset?.url ? (
                            <img src={`${API_BASE_URL}${asset.url}`} alt={entry.alt.en ?? `Photo ${index + 1}`} />
                          ) : (
                            <div className="ph">Processing…</div>
                          )}
                        </div>
                        <div className="lw-media-card__head">
                          <Badge tone={form.coverAssetId === entry.assetId ? 'good' : 'neutral'}>
                            {form.coverAssetId === entry.assetId ? 'Cover' : `Photo ${index + 1}`}
                          </Badge>
                          {asset ? <span className="adm-hint">{formatBytes(asset.bytes)}</span> : null}
                        </div>
                        <figcaption className="lw-media-card__body">
                          <div className="lw-media-card__alts">
                            <div>
                              <Label htmlFor={`pe-alt-en-${entry.assetId}`}>Alt (English)</Label>
                              <input
                                id={`pe-alt-en-${entry.assetId}`}
                                className="field"
                                disabled={busy || !mayManage}
                                value={entry.alt.en ?? ''}
                                onChange={(event) => {
                                  const media = form.media.map((item) =>
                                    item.assetId === entry.assetId ? { ...item, alt: { ...item.alt, en: event.target.value || null } } : item,
                                  );
                                  setForm({ ...form, media });
                                }}
                              />
                            </div>
                            {form.languageMode !== 'en' ? (
                              <div>
                                <Label htmlFor={`pe-alt-ar-${entry.assetId}`}>Alt (Arabic)</Label>
                                <input
                                  id={`pe-alt-ar-${entry.assetId}`}
                                  className="field"
                                  dir="rtl"
                                  disabled={busy || !mayManage}
                                  value={entry.alt.ar ?? ''}
                                  onChange={(event) => {
                                    const media = form.media.map((item) =>
                                      item.assetId === entry.assetId ? { ...item, alt: { ...item.alt, ar: event.target.value || null } } : item,
                                    );
                                    setForm({ ...form, media });
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="lw-media-card__actions">
                            <GhostButton
                              type="button"
                              disabled={index === 0 || busy || !mayManage}
                              onClick={() => setForm({ ...form, media: moveMedia(form.media, index, index - 1) })}
                            >
                              ↑
                            </GhostButton>
                            <GhostButton
                              type="button"
                              disabled={index === form.media.length - 1 || busy || !mayManage}
                              onClick={() => setForm({ ...form, media: moveMedia(form.media, index, index + 1) })}
                            >
                              ↓
                            </GhostButton>
                            <GhostButton
                              type="button"
                              disabled={busy || !mayManage || form.coverAssetId === entry.assetId}
                              onClick={() => setForm({ ...form, coverAssetId: coverAfterChange(form.media, entry.assetId) })}
                            >
                              Set cover
                            </GhostButton>
                            <GhostButton
                              type="button"
                              disabled={busy || !mayManage}
                              onClick={() => {
                                const media = form.media.filter((item) => item.assetId !== entry.assetId);
                                setForm({ ...form, media, coverAssetId: coverAfterChange(media, form.coverAssetId) });
                              }}
                            >
                              Remove
                            </GhostButton>
                          </div>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="adm-section">
            <h3>Staff options</h3>
            <div className="adm-grid adm-grid--2">
              <div>
                <Toggle
                  id="pe-featured"
                  label="Featured on homepage"
                  checked={form.featured}
                  onChange={(next) => setForm({ ...form, featured: next })}
                />
                <Hint>Featured placement is a staff decision.</Hint>
              </div>
              <div>
                <Label htmlFor="pe-notes">Admin notes</Label>
                <textarea
                  id="pe-notes"
                  className="field"
                  rows={3}
                  disabled={busy || !mayManage}
                  value={form.adminNotes}
                  onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                  placeholder="Private notes — never shown publicly"
                />
              </div>
            </div>
          </section>

          <section className="adm-section">
            <h3>Publish checklist</h3>
            <ul className="lw-checklist" style={css('list-style: none; margin: 0; padding: 0; display: grid; gap: 6px')}>
              <li className={problems.length === 0 ? 'lw-check ok' : 'lw-check bad'}>
                {problems.length === 0 ? 'Advertisement language is complete' : problems.join(' · ')}
              </li>
              <li className={form.media.length > 0 ? 'lw-check ok' : 'lw-check bad'}>
                {form.media.length > 0 ? `${form.media.length} image(s) attached` : 'At least one image required to publish'}
              </li>
              {/* Category details check hidden with that section
              <li className={missingRequired.length === 0 ? 'lw-check ok' : 'lw-check bad'}>
                {missingRequired.length === 0 ? 'Required category details are set' : `Missing: ${missingRequired.join(', ')}`}
              </li>
              */}
              {listing?.status === 'published' ? <li className="lw-check ok">Already published</li> : null}
            </ul>
            {mayManage && listing && listing.status !== 'published' && listing.status !== 'archived' ? (
              <div style={css('margin-top: 10px')}>
                <Toggle
                  id="pe-confirm-publish"
                  label="I reviewed the content, details and photos"
                  checked={confirmPublish}
                  onChange={setConfirmPublish}
                />
              </div>
            ) : null}
          </section>
        </form>
      )}
    </Modal>
  );
}
