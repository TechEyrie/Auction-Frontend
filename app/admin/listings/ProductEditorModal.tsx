'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { formatBytes } from '../../../lib/admin';
import {
  firstListingErrorPath,
  firstListingErrorSection,
  listingFailureState,
  listingFieldFocusId,
  listingFieldInlineMessage,
  missingRequiredAttributeLabels,
  type ListingValidationAlert,
} from '../../../lib/listingFieldErrors';
import {
  attributePayload,
  mapListingConditionToItemCondition,
  withSyncedItemCondition,
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
import { BUSINESS_TIMEZONE, fmtBusinessDateTime } from '../../../lib/format';
import type { SessionValue } from '../../../lib/session';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Modal, PrimaryButton, Toggle } from '../ui';
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
    throw new Error('Choose audience (Men, Women or Unisex) and category before saving or uploading photos.');
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
    attributes: attributePayload(fields, withSyncedItemCondition(fields, form.attributes, form.condition)),
    media: mediaPayload(form.media),
    coverAssetId: form.coverAssetId,
    featured: form.featured,
    adminNotes: form.adminNotes.trim() ? form.adminNotes.trim() : null,
    // Always send priceMinor so switching auction ↔ fixed-price clears or sets the server value.
    priceMinor: priceMinorFromForm(form),
  };
}

function scrollToFirstListingError(fieldErrors: Record<string, string>): void {
  const section = firstListingErrorSection(fieldErrors);
  if (!section) return;
  document.querySelector(`[data-listing-section="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const path = firstListingErrorPath(fieldErrors);
  const id = path ? listingFieldFocusId(path, 'modal') : null;
  if (id) document.getElementById(id)?.focus({ preventScroll: true });
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
  onDeleted,
  onDuplicated,
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
  onDeleted?: (listingReference: string) => void;
  onDuplicated?: (listing: AdminListing) => void;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationAlert, setValidationAlert] = useState<ListingValidationAlert | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Removed by operator');
  const [duplicateOpen, setDuplicateOpen] = useState(false);

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
      const next = listingFailureState(err, { schemaFields: [] });
      setFieldErrors(next.fieldErrors);
      setValidationAlert(next.validationAlert);
      setError(next.message);
    } finally {
      setLoading(false);
    }
  }, [loadAssets]);

  // Reset / hydrate only when the dialog opens or the target listing changes — never on
  // every keystroke (unstable callback deps would wipe the form and steal focus).
  useEffect(() => {
    if (!open) return;
    setConfirmPublish(false);
    setDeleteOpen(false);
    setDeleteReason('Removed by operator');
    setError(null);
    setFieldErrors({});
    setValidationAlert(null);
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
  const missingRequired = missingRequiredAttributeLabels(visible, form.attributes);
  const fieldErrorCtx = useMemo(() => ({ schemaFields }), [schemaFields]);
  const readyAssets = useMemo(() => assets.filter((asset) => asset.status === 'ready'), [assets]);

  const applyListingFailure = useCallback(
    (err: unknown, publishAttempt?: boolean) => {
      const next = listingFailureState(err, fieldErrorCtx, { publishAttempt });
      setFieldErrors(next.fieldErrors);
      setValidationAlert(next.validationAlert);
      setError(next.message);
      if (Object.keys(next.fieldErrors).length > 0) {
        queueMicrotask(() => scrollToFirstListingError(next.fieldErrors));
      }
    },
    [fieldErrorCtx],
  );

  function inlineFieldError(path: string): string | null {
    return listingFieldInlineMessage(fieldErrors, path, fieldErrorCtx);
  }

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
    setFieldErrors({});
    setValidationAlert(null);
    setNotice(null);
    try {
      const saved = await saveAll();
      setNotice('Product saved.');
      onSaved(saved);
    } catch (err) {
      applyListingFailure(err);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setValidationAlert(null);
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
      applyListingFailure(err, true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(): Promise<void> {
    if (!listing || listing.moderation.state === 'blocked') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ listing: AdminListing }>(
        `/api/admin/listings/${listing.listingReference}/duplicate`,
        { method: 'POST', json: {}, headers: session.authHeaders() },
      );
      setDuplicateOpen(false);
      onDuplicated?.(response.listing);
    } catch (err) {
      applyListingFailure(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    if (!listing || listing.status === 'archived') return;
    const reason = deleteReason.trim();
    if (reason.length < 3) {
      setError('Delete needs a written reason (at least 3 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/listings/${listing.listingReference}/archive`, {
        method: 'POST',
        json: { reason },
        headers: session.authHeaders(),
      });
      setDeleteOpen(false);
      onDeleted?.(listing.listingReference);
    } catch (err) {
      applyListingFailure(err);
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
      applyListingFailure(err);
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
  const timeBits = listing
    ? [
        listing.createdAt ? `Created ${fmtBusinessDateTime(listing.createdAt)}` : null,
        listing.updatedAt ? `Updated ${fmtBusinessDateTime(listing.updatedAt)}` : null,
        listing.publishedAt ? `Published ${fmtBusinessDateTime(listing.publishedAt)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const subtitle = ref
    ? [
        `${listing?.status ?? 'draft'} · ${METHOD_LABEL[form.listingMethod]}`,
        listing?.publicUrl ?? null,
        timeBits || null,
        `Times ${BUSINESS_TIMEZONE}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : `Fill in everything here — basics, copy, details, photos, then save or publish. Times use ${BUSINESS_TIMEZONE}.`;

  const canPublish =
    mayManage &&
    listing &&
    listing.status !== 'published' &&
    listing.status !== 'archived' &&
    problems.length === 0 &&
    form.media.length > 0 &&
    missingRequired.length === 0;

  return (
    <>
    <Modal
      open={open}
      onClose={() => !busy && !loading && onClose()}
      title={title}
      subtitle={subtitle}
      size="xl"
      footer={
        <>
          <div style={css('display: flex; flex-wrap: wrap; gap: 8px; align-items: center')}>
            {mayManage && listing && listing.moderation.state !== 'blocked' ? (
              <GhostButton
                type="button"
                disabled={busy || loading}
                onClick={() => {
                  setDuplicateOpen(true);
                  setError(null);
                }}
              >
                Duplicate as unsold
              </GhostButton>
            ) : null}
            {mayManage && listing && listing.status !== 'archived' ? (
              <GhostButton
                type="button"
                disabled={busy || loading}
                onClick={() => {
                  setDeleteReason('Removed by operator');
                  setDeleteOpen(true);
                  setError(null);
                }}
              >
                <span style={css('color: #8A2C11; font-weight: 600')}>Delete</span>
              </GhostButton>
            ) : null}
            <GhostButton type="button" disabled={busy || loading} onClick={onClose}>
              Close
            </GhostButton>
          </div>
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
          {validationAlert ? (
            <ErrorNote>
              <span style={css('display: block; font-weight: 600; margin-bottom: 6px')}>{validationAlert.headline}</span>
              <ul style={css('margin: 0; padding-left: 1.25rem')}>
                {validationAlert.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ErrorNote>
          ) : (
            <ErrorNote>{error}</ErrorNote>
          )}
          {notice ? (
            <p className="adm-note" data-tone="good" style={css('margin: 0')}>
              {notice}
            </p>
          ) : null}

          <section className="adm-section" data-listing-section="basics">
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
                  <option value="">Choose Men, Women or Unisex…</option>
                  {AUDIENCES.map((entry) => (
                    <option key={entry} value={entry}>
                      {AUDIENCE_LABEL[entry]}
                    </option>
                  ))}
                </select>
                <FieldError>{inlineFieldError('audience')}</FieldError>
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
                <FieldError>{inlineFieldError('categoryKey')}</FieldError>
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
              const condition = conditionOptionsFor(listingMethod)[0];
              const mapped = mapListingConditionToItemCondition(condition);
              const attributes =
                schemaFields.some((field) => field.key === 'item_condition') && mapped !== null
                  ? { ...form.attributes, item_condition: mapped }
                  : form.attributes;
              setForm({
                ...form,
                listingMethod,
                condition,
                attributes,
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
          <FieldError>{inlineFieldError('listingMethod')}</FieldError>
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
            <FieldError>{inlineFieldError('priceMinor')}</FieldError>
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
                <FieldError>{inlineFieldError('languageMode')}</FieldError>
              </div>
              <div>
                <Label htmlFor="pe-condition">Condition</Label>
                <select
                  id="pe-condition"
                  className="field"
                  disabled={busy || !mayManage}
                  value={form.condition ?? ''}
                  onChange={(event) => {
                    const condition = event.target.value as Condition;
                    const mapped = mapListingConditionToItemCondition(condition);
                    const attributes =
                      schemaFields.some((field) => field.key === 'item_condition') && mapped !== null
                        ? { ...form.attributes, item_condition: mapped }
                        : form.attributes;
                    setForm({ ...form, condition, attributes });
                  }}
                >
                  {conditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {CONDITION_LABEL[condition]}
                    </option>
                  ))}
                </select>
                <Hint>Also fills Category details → Condition (refurbished maps to Used).</Hint>
                <FieldError>{inlineFieldError('condition')}</FieldError>
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
                <FieldError>{inlineFieldError('locationKey')}</FieldError>
              </div>
            </div>
          </section>

          <section className="adm-section" data-listing-section="content">
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
                <FieldError>{inlineFieldError('title.en')}</FieldError>
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
                <FieldError>{inlineFieldError('title.ar')}</FieldError>
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
                <FieldError>{inlineFieldError('description.en')}</FieldError>
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
                <FieldError>{inlineFieldError('description.ar')}</FieldError>
              </div>
            ) : null}
          </section>

          <section className="adm-section" data-listing-section="attributes">
            <h3>Category details</h3>
            <p className="adm-section-hint">
              {form.categoryKey
                ? schemaFields.length > 0
                  ? 'Structured fields from this category’s published attribute schema. Required fields must be set before publish.'
                  : 'This category has no published attribute schema yet.'
                : 'Choose a category to load its detail fields.'}
            </p>
            {form.categoryKey && schemaFields.length === 0 ? (
              <p className="adm-state">Nothing to fill for this category.</p>
            ) : null}
            {visible.length > 0 ? (
              <div className="adm-grid adm-grid--2">
                {visible.map((entry) => (
                  <div key={entry.key} className={entry.adminOnly ? 'lw-admin-field' : undefined}>
                    <Label htmlFor={`pe-attr-${entry.key}`}>
                      {entry.labelEn}
                      {entry.unit ? ` (${entry.unit})` : ''}
                      {entry.required ? ' *' : ''}
                      {entry.adminOnly ? ' · staff only' : ''}
                    </Label>
                    {entry.type === 'select' && (
                      <select
                        id={`pe-attr-${entry.key}`}
                        className="field"
                        disabled={busy || !mayManage}
                        value={String(form.attributes[entry.key] ?? '')}
                        onChange={(event) =>
                          setForm({ ...form, attributes: { ...form.attributes, [entry.key]: event.target.value || null } })
                        }
                      >
                        <option value="">Not set</option>
                        {entry.options.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.labelEn}
                          </option>
                        ))}
                      </select>
                    )}
                    {entry.type === 'boolean' && (
                      <Toggle
                        id={`pe-attr-${entry.key}`}
                        label={form.attributes[entry.key] === true ? 'Yes' : form.attributes[entry.key] === false ? 'No' : 'Not set'}
                        checked={form.attributes[entry.key] === true}
                        onChange={(next) => setForm({ ...form, attributes: { ...form.attributes, [entry.key]: next } })}
                      />
                    )}
                    {entry.type === 'multiselect' && (
                      <select
                        id={`pe-attr-${entry.key}`}
                        className="field"
                        multiple
                        disabled={busy || !mayManage}
                        value={Array.isArray(form.attributes[entry.key]) ? (form.attributes[entry.key] as string[]) : []}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            attributes: {
                              ...form.attributes,
                              [entry.key]: [...event.target.selectedOptions].map((option) => option.value),
                            },
                          })
                        }
                      >
                        {entry.options.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.labelEn}
                          </option>
                        ))}
                      </select>
                    )}
                    {(entry.type === 'text' || entry.type === 'number' || entry.type === 'date') && (
                      <input
                        id={`pe-attr-${entry.key}`}
                        className="field"
                        inputMode={entry.type === 'number' ? 'decimal' : undefined}
                        type={entry.type === 'date' ? 'date' : 'text'}
                        disabled={busy || !mayManage}
                        value={String(form.attributes[entry.key] ?? '')}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            attributes: { ...form.attributes, [entry.key]: event.target.value === '' ? null : event.target.value },
                          })
                        }
                      />
                    )}
                    {entry.helpEn ? <Hint>{entry.helpEn}</Hint> : null}
                    {entry.key === 'item_condition' ? (
                      <Hint>When empty, Basics → Condition fills this automatically.</Hint>
                    ) : null}
                    <FieldError>{inlineFieldError(`attributes.${entry.key}`)}</FieldError>
                  </div>
                ))}
              </div>
            ) : null}
            {missingRequired.length > 0 ? (
              <p className="adm-note" data-tone="warn" style={css('margin: 12px 0 0')}>
                Required before publish (category details): {missingRequired.join(', ')}
              </p>
            ) : null}
            <FieldError>{inlineFieldError('attributes')}</FieldError>
          </section>

          <section className="adm-section" data-listing-section="media">
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
            <FieldError>{inlineFieldError('media') ?? inlineFieldError('coverAssetId')}</FieldError>
          </section>

          <section className="adm-section" data-listing-section="review">
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
              <li className={missingRequired.length === 0 ? 'lw-check ok' : 'lw-check bad'}>
                {missingRequired.length === 0
                  ? schemaFields.length > 0
                    ? 'Required category details are set'
                    : 'No category attribute schema (or none required)'
                  : `Missing category details: ${missingRequired.join(', ')}`}
              </li>
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

    <Modal
      open={duplicateOpen}
      onClose={() => !busy && setDuplicateOpen(false)}
      title="Duplicate as unsold"
      subtitle={listing ? `Ad ${listing.listingReference}` : undefined}
      size="sm"
      footer={
        <>
          <GhostButton type="button" disabled={busy} onClick={() => setDuplicateOpen(false)}>Cancel</GhostButton>
          <PrimaryButton type="button" disabled={busy} onClick={() => void handleDuplicate()}>
            Duplicate
          </PrimaryButton>
        </>
      }
    >
      <p style={css('margin: 0; line-height: 1.5')}>
        This creates a new draft copy with fresh reference and photos. Availability is reset to unsold.
        The original product, its sale history, auctions and orders stay exactly as they are.
      </p>
    </Modal>

    <Modal
      open={deleteOpen}
      onClose={() => !busy && setDeleteOpen(false)}
      title="Delete product"
      subtitle={listing ? `Ad ${listing.listingReference}` : undefined}
      size="sm"
      footer={
        <>
          <GhostButton type="button" disabled={busy} onClick={() => setDeleteOpen(false)}>Cancel</GhostButton>
          <PrimaryButton type="button" disabled={busy} onClick={() => void handleDelete()}>
            Delete
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={(event) => void handleDelete(event)}>
        <Label htmlFor="pe-delete-reason">Reason</Label>
        <textarea
          id="pe-delete-reason"
          className="field"
          rows={3}
          value={deleteReason}
          onChange={(event) => setDeleteReason(event.target.value)}
          placeholder="Why is this product being removed?"
        />
      </form>
    </Modal>
    </>
  );
}
