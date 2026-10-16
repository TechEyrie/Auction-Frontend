'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, apiFetch, ApiRequestError } from '../../../../lib/api';
import { css } from '../../../../lib/css';
import { useSession } from '../../../../lib/session';
import { fieldError, formatBytes } from '../../../../lib/admin';
import {
  attributePayload,
  AUDIENCE_LABEL,
  AUDIENCES,
  beginSave,
  completeSave,
  conditionOptionsFor,
  coverAfterChange,
  initialSaveTrack,
  incompatibleAttributeKeys,
  LANGUAGE_MODE_LABEL,
  LISTING_METHODS,
  METHOD_LABEL,
  localizedProblems,
  markDirty,
  mediaPayload,
  moveMedia,
  reconciliationSummary,
  requiredLocales,
  saveStatusText,
  shouldAdoptServerForm,
  visibleFields,
  type AdminListing,
  type AttributeField,
  type Audience,
  type Condition,
  type LanguageMode,
  type ListingMethod,
  type LocalizedText,
  type Reconciliation,
} from '../../../../lib/listings';
import { Badge, ErrorNote, FieldError, GhostButton, Hint, Label, Panel, PrimaryButton, StateBlock, TableWrap, Toggle } from '../../ui';
import '../listings.css';

type CategoryOption = { key: string; name: string; parentKey: string | null; depth: number; listingMethods: ListingMethod[]; active?: boolean };
type LocationOption = { key: string; label: string; cityKey: string; active?: boolean };
type SellerOption = { sellerReference: string; displayName: string; status: string; verification: { state: string } };
type SchemaResponse = { schema: { version: number; fields: AttributeField[] } | null; schemaChanged: boolean };
type Asset = {
  assetId: string;
  status: 'staging' | 'ready' | 'rejected' | 'failed';
  bytes: number;
  image: { width: number; height: number } | null;
  mime: string | null;
  statusReason: string | null;
  url: string | null;
};

type FormState = {
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

const STEPS = ['basics', 'content', 'attributes', 'media', 'review'] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = {
  basics: 'Basics',
  content: 'The ad',
  attributes: 'Details',
  media: 'Photos',
  review: 'Publish',
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

function formFrom(listing: AdminListing): FormState {
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

function payloadOf(form: FormState, fields: AttributeField[]): Record<string, unknown> {
  return {
    sellerReference: form.sellerReference,
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
    adminNotes: form.adminNotes.trim() ? form.adminNotes : null,
    ...(form.listingMethod === 'fixed_price' && form.priceQar.trim()
      ? { priceMinor: Math.round(Number(form.priceQar) * 100) }
      : {}),
  };
}

/**
 * The listing wizard.
 *
 * Four data steps and a review step, all backed by real server records: the draft exists in the
 * database from the moment it is created, every edit is a conditional write against the version
 * the editor read, and publication is a server decision that can refuse. Nothing here is a
 * preview of a listing that does not exist, and no button claims success the API did not confirm.
 */
export default function AdminListingWizardPage() {
  const params = useParams<{ ref: string }>();
  const ref = typeof params?.ref === 'string' ? params.ref : '';
  const session = useSession();
  const router = useRouter();
  const mayManage = session.capabilities.includes('inventory.manage');

  const [listing, setListing] = useState<AdminListing | null>(null);
  const [schema, setSchema] = useState<{ version: number; fields: AttributeField[] } | null>(null);
  const [schemaChanged, setSchemaChanged] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [track, setTrack] = useState(initialSaveTrack(1));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('basics');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [busy, setBusy] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [pendingCategory, setPendingCategory] = useState<{ key: string; version: number | null; fields: AttributeField[]; dropped: string[] } | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]); // seller picker commented out; fetch kept for restore

  const formRef = useRef<FormState | null>(null);
  formRef.current = form;
  const trackRef = useRef(track);
  trackRef.current = track;
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [listingResponse, categoryResponse, locationResponse, sellerResponse] = await Promise.all([
        apiFetch<SchemaResponse & { listing: AdminListing }>(`/api/admin/listings/${ref}`, { cache: 'no-store' }),
        apiFetch<{ categories: CategoryOption[] }>('/api/admin/categories?includeInactive=true', { cache: 'no-store' }),
        apiFetch<{ locations: LocationOption[] }>('/api/admin/locations', { cache: 'no-store' }),
        apiFetch<{ sellers: SellerOption[] }>('/api/admin/sellers?limit=100', { cache: 'no-store' }),
      ]);
      setListing(listingResponse.listing);
      setSchema(listingResponse.schema);
      setSchemaChanged(listingResponse.schemaChanged);
      setForm(formFrom(listingResponse.listing));
      setTrack(initialSaveTrack(listingResponse.listing.version));
      setCategories(categoryResponse.categories);
      setLocations(locationResponse.locations);
      setSellers(sellerResponse.sellers);
    } catch (err) {
      setLoadError(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadAssets = useCallback(async () => {
    if (!ref) return;
    setAssetsError(null);
    try {
      const response = await apiFetch<{ assets: Asset[] }>(`/api/admin/media?collectionKey=${encodeURIComponent(`listing_${ref}`)}`, {
        cache: 'no-store',
      });
      setAssets(response.assets);
    } catch (err) {
      setAssetsError(apiMessage(err));
    }
  }, [ref]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  /** Save the current form. Returns the server listing, or null when the save was refused. */
  const save = useCallback(
    async (overrides: Partial<FormState> = {}): Promise<AdminListing | null> => {
      const current = formRef.current;
      if (!current) return null;
      const merged: FormState = { ...current, ...overrides };
      const started = beginSave(trackRef.current);
      setTrack(started);
      setFieldErrors({});
      setBanner(null);
      const fields = schema?.fields ?? [];
      // The document this request describes, so its response is never written back over edits
      // that were made while it was in flight.
      const signatureAtStart = JSON.stringify(payloadOf(merged, fields));
      try {
        const response = await apiFetch<{ listing: AdminListing; reconciliation: Reconciliation | null }>(
          `/api/admin/listings/${ref}`,
          {
            method: 'PATCH',
            json: { ...payloadOf(merged, fields), expectedVersion: started.version },
            headers: session.authHeaders(),
          },
        );
        setTrack(completeSave(started, started.ticket, { ok: true, version: response.listing.version }));
        setListing(response.listing);
        if (shouldAdoptServerForm(signatureAtStart, signatureRef.current)) {
          setForm(formFrom(response.listing));
          setReconciliation(response.reconciliation);
        }
        setSchemaChanged(false);
        return response.listing;
      } catch (err) {
        const errors = fieldErrorsOf(err);
        setFieldErrors(errors);
        const conflict = err instanceof ApiRequestError && err.status === 409;
        const details = err instanceof ApiRequestError ? (err.body.details as { currentVersion?: number }) : {};
        setTrack(
          completeSave(started, started.ticket, {
            ok: false,
            conflict,
            message: apiMessage(err),
            currentVersion: typeof details.currentVersion === 'number' ? details.currentVersion : null,
          }),
        );
        if (!conflict) setBanner(apiMessage(err));
        return null;
      }
    },
    [ref, schema, session, track],
  );

  // Local edits are marked dirty; a debounce then saves them. The ticket guard in `completeSave`
  // is what stops an older response from reporting over a newer one.
  const dirtySignature = useMemo(() => (form ? JSON.stringify(payloadOf(form, schema?.fields ?? [])) : ''), [form, schema]);
  const lastSavedSignature = useRef('');
  /** The newest local document, so a save response can tell whether it is still current. */
  const signatureRef = useRef('');
  useEffect(() => {
    signatureRef.current = dirtySignature;
    if (!form || !mayManage) return;
    if (dirtySignature === lastSavedSignature.current) return;
    setTrack((current) => (current.status === 'saving' ? current : markDirty(current)));
    const timer = setTimeout(() => {
      void save().then((saved) => {
        if (saved) lastSavedSignature.current = dirtySignature;
      });
    }, 1200);
    return () => clearTimeout(timer);
    // `save` is recreated as the track/schema change, so it is intentionally not a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtySignature, form, mayManage]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (track.status === 'dirty' || track.status === 'saving' || track.status === 'failed' || track.status === 'conflict') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [track.status]);

  /** A category change may invalidate stored values; the wizard asks before dropping them. */
  async function chooseCategory(nextKey: string): Promise<void> {
    if (!form) return;
    if (nextKey === form.categoryKey) return;
    try {
      const response = await apiFetch<{ schemas: Array<{ version: number; status: string; fields: AttributeField[] }> }>(
        `/api/admin/attribute-schemas?categoryKey=${encodeURIComponent(nextKey)}`,
        { cache: 'no-store' },
      );
      const published = response.schemas.find((entry) => entry.status === 'published') ?? null;
      const fields = published?.fields ?? [];
      const dropped = incompatibleAttributeKeys(fields, form.attributes);
      const category = categories.find((entry) => entry.key === nextKey);
      const methodAllowed = category?.listingMethods.includes(form.listingMethod) ?? true;
      const method: ListingMethod = methodAllowed ? form.listingMethod : (category?.listingMethods[0] ?? form.listingMethod);
      const allowedConditions = conditionOptionsFor(method);
      const condition: Condition | null =
        form.condition && allowedConditions.includes(form.condition) ? form.condition : method === 'enquiry' ? 'not_applicable' : null;

      if (dropped.length === 0) {
        setForm({ ...form, categoryKey: nextKey, listingMethod: method, condition, attributes: {} });
        setSchema(published ? { version: published.version, fields } : null);
        setSchemaChanged(false);
        return;
      }
      setPendingCategory({ key: nextKey, version: published?.version ?? null, fields, dropped });
    } catch (err) {
      setBanner(apiMessage(err));
    }
  }

  function applyPendingCategory(): void {
    if (!form || !pendingCategory) return;
    const category = categories.find((entry) => entry.key === pendingCategory.key);
    const methodAllowed = category?.listingMethods.includes(form.listingMethod) ?? true;
    const method: ListingMethod = methodAllowed ? form.listingMethod : (category?.listingMethods[0] ?? form.listingMethod);
    const kept: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form.attributes)) {
      if (!pendingCategory.dropped.includes(key)) kept[key] = value;
    }
    const allowedConditions = conditionOptionsFor(method);
    const condition: Condition | null =
      form.condition && allowedConditions.includes(form.condition) ? form.condition : method === 'enquiry' ? 'not_applicable' : null;
    setForm({ ...form, categoryKey: pendingCategory.key, listingMethod: method, condition, attributes: kept });
    setSchema({ version: pendingCategory.version ?? 0, fields: pendingCategory.fields });
    setPendingCategory(null);
    setStep('attributes');
  }

  async function publish(): Promise<void> {
    if (!listing) return;
    setBusy(true);
    setFieldErrors({});
    setBanner(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ listing: AdminListing; publicUrl: string }>(`/api/admin/listings/${ref}/publish`, {
        method: 'POST',
        json: { expectedVersion: track.version },
        headers: session.authHeaders(),
      });
      setListing(response.listing);
      setForm(formFrom(response.listing));
      setTrack(initialSaveTrack(response.listing.version));
      setNotice(`Published. Public URL: ${response.publicUrl}`);
      setConfirmingPublish(false);
    } catch (err) {
      setFieldErrors(fieldErrorsOf(err));
      setBanner(apiMessage(err));
      if (!(err instanceof ApiRequestError && err.status === 409)) setConfirmingPublish(false);
      else setTrack((current) => ({ ...current, status: 'conflict', message: apiMessage(err) }));
    } finally {
      setBusy(false);
    }
  }

  async function archive(): Promise<void> {
    const reason = archiveReason.trim();
    if (reason.length < 3) {
      setBanner('Archiving needs a written reason (at least 3 characters).');
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const response = await apiFetch<{ listing: AdminListing }>(`/api/admin/listings/${ref}/archive`, {
        method: 'POST',
        json: { reason },
        headers: session.authHeaders(),
      });
      setListing(response.listing);
      setForm(formFrom(response.listing));
      setTrack(initialSaveTrack(response.listing.version));
      setNotice('Archived. It is out of public view; republish it to bring it back.');
      setArchiveReason('');
    } catch (err) {
      setBanner(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File): Promise<void> {
    setBanner(null);
    setProgress(0);
    await new Promise<void>((resolve) => {
      const request = new XMLHttpRequest();
      request.open('POST', `${API_BASE_URL}/api/admin/media/upload`);
      request.withCredentials = true;
      request.setRequestHeader('content-type', file.type || 'application/octet-stream');
      request.setRequestHeader('x-collection-key', `listing_${ref}`);
      for (const [name, value] of Object.entries(session.authHeaders())) request.setRequestHeader(name, value);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () => {
        setProgress(null);
        if (request.status === 201) {
          const body = JSON.parse(request.responseText) as { asset: { assetId: string } };
          const current = formRef.current;
          if (current) {
            const media = [...current.media, { assetId: body.asset.assetId, alt: { en: null, ar: null } }];
            const next = { ...current, media, coverAssetId: coverAfterChange(media, current.coverAssetId) };
            setForm(next);
            formRef.current = next;
          }
          void loadAssets();
        } else {
          try {
            const body = JSON.parse(request.responseText) as { error?: { message?: string } };
            setBanner(body.error?.message ?? `Upload failed with status ${request.status}`);
          } catch {
            setBanner(`Upload failed with status ${request.status}`);
          }
        }
        resolve();
      };
      request.onerror = () => {
        setProgress(null);
        setBanner('The upload could not reach the server.');
        resolve();
      };
      request.send(file);
    });
  }

  const readyAssets = assets.filter((asset) => asset.status === 'ready');
  const problems = form ? localizedProblems({ title: form.title, description: form.description, languageMode: form.languageMode }) : [];
  const category = categories.find((entry) => entry.key === form?.categoryKey) ?? null;
  const fields = schema?.fields ?? [];
  const visible = form ? visibleFields(fields, form.attributes) : [];
  const missingRequired = form
    ? visible.filter((entry) => entry.required && (form.attributes[entry.key] === undefined || form.attributes[entry.key] === null || form.attributes[entry.key] === '')).map((entry) => entry.key)
    : [];

  if (loading) {
    return (
      <Panel title="Listing">
        <p role="status" className="adm-state" data-state="loading">
          Loading…
        </p>
      </Panel>
    );
  }

  if (loadError || !listing || !form) {
    return (
      <Panel title="Listing">
        <div role="alert" className="adm-state" data-state="error">
          <p style={css('margin: 0 0 10px; font-weight: 600')}>{loadError ?? 'This listing could not be loaded.'}</p>
          <div className="adm-actions">
            <PrimaryButton type="button" onClick={() => void load()}>
              Retry
            </PrimaryButton>
            <Link href="/admin/listings" style={css('font-weight: 600')}>
              Back to listings
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  const statusTone = listing.status === 'published' ? 'good' : listing.status === 'archived' ? 'warn' : 'neutral';
  void sellers; // seller picker commented out; state/fetch kept for easy restore

  return (
    <div className="lw-wizard" style={css('display: flex; flex-direction: column; gap: 16px')}>
      <Panel
        title={listing.title.en ?? listing.title.ar ?? 'Untitled draft'}
        subtitle={`${listing.publicUrl} · ${LANGUAGE_MODE_LABEL[form.languageMode]} · ${METHOD_LABEL[form.listingMethod]}`}
        actions={
          <>
            <Badge tone={statusTone}>{listing.status}</Badge>
            <Badge tone={track.status === 'failed' || track.status === 'conflict' ? 'bad' : track.status === 'saved' ? 'good' : 'neutral'}>
              {saveStatusText(track)}
            </Badge>
            <Link href="/admin/listings" style={css('font-weight: 600; font-size: 14px')}>
              All listings
            </Link>
          </>
        }
      >
        <ErrorNote>{banner}</ErrorNote>
        {notice && (
          <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>
            {notice}
          </p>
        )}
        {reconciliation && (
          <p className="adm-note" data-tone="good" style={css('margin-bottom: 14px')}>
            {reconciliationSummary(reconciliation)}
          </p>
        )}
        {schemaChanged && (
          <p className="adm-note" data-tone="bad" style={css('margin-bottom: 14px')}>
            This category&apos;s attribute schema changed since the listing was last saved. Save the attributes
            step to revalidate against version {schema?.version === 0 ? 'the current version' : `${schema?.version ?? '—'}`} before publishing.
          </p>
        )}

        {track.status === 'conflict' && (
          <div role="alert" className="adm-state" data-state="error" style={css('margin-bottom: 14px')}>
            <p style={css('margin: 0 0 10px; font-weight: 600')}>
              {track.message ?? 'This listing changed elsewhere.'}
            </p>
            <GhostButton
              onClick={() => {
                void load().then(() => setNotice('Reloaded the server version. Local unsaved edits were discarded.'));
              }}
            >
              Reload server version
            </GhostButton>
          </div>
        )}

        {pendingCategory && (
          <div role="alertdialog" aria-label="Confirm category change" className="adm-state" data-state="error" style={css('margin-bottom: 14px')}>
            <p style={css('margin: 0 0 6px; font-weight: 600')}>
              Switching to {pendingCategory.key} will clear {pendingCategory.dropped.length} value
              {pendingCategory.dropped.length === 1 ? '' : 's'} that this category does not define.
            </p>
            <p style={css('margin: 0 0 10px')}>{pendingCategory.dropped.join(', ')}</p>
            <div className="adm-actions">
              <PrimaryButton type="button" onClick={applyPendingCategory}>
                Change category and clear them
              </PrimaryButton>
              <GhostButton onClick={() => setPendingCategory(null)}>Keep the current category</GhostButton>
            </div>
          </div>
        )}

        <nav aria-label="Wizard steps" className="lw-steps">
          {STEPS.map((entry) => (
            <button key={entry} type="button" aria-current={step === entry ? 'step' : undefined} onClick={() => setStep(entry)} className="lw-step">
              {STEP_LABEL[entry]}
            </button>
          ))}
        </nav>

        {step === 'basics' && (
          <div className="adm-form lw-step-panel">
            <div className="adm-grid adm-grid--2">
              {/* Seller picker hidden for now — existing sellerReference is kept on the listing.
              <div>
                <Label htmlFor="w-seller">Seller</Label>
                <select
                  id="w-seller"
                  className="field"
                  value={form.sellerReference}
                  disabled={!mayManage}
                  onChange={(event) => setForm({ ...form, sellerReference: event.target.value })}
                >
                  <option value="">Choose a seller…</option>
                  {sellers.map((seller) => (
                    <option key={seller.sellerReference} value={seller.sellerReference}>
                      {seller.displayName} ({seller.status})
                    </option>
                  ))}
                  {!sellers.some((seller) => seller.sellerReference === form.sellerReference) && (
                    <option value={form.sellerReference}>{form.sellerReference}</option>
                  )}
                </select>
                <Hint>Sellers are offline records created by staff — a listing never creates an account.</Hint>
                <FieldError>{fieldError(fieldErrors, 'sellerReference')}</FieldError>
              </div>
              */}
              <div>
                <Label htmlFor="w-category">Category</Label>
                <select id="w-category" className="field" value={form.categoryKey} disabled={!mayManage} onChange={(event) => void chooseCategory(event.target.value)}>
                  {(categories.length === 0 ? [{ key: form.categoryKey, name: form.categoryKey, parentKey: null, depth: 0, listingMethods: [] }] : categories).map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {'—'.repeat(entry.depth + 1)} {entry.name}
                      {entry.active === false ? ' (archived)' : ''}
                    </option>
                  ))}
                </select>
                <Hint>Attributes and location rules follow the category. Changing it revalidates stored values.</Hint>
                <FieldError>{fieldError(fieldErrors, 'categoryKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="w-audience">Audience</Label>
                <select
                  id="w-audience"
                  className="field"
                  value={form.audience}
                  disabled={!mayManage}
                  onChange={(event) => setForm({ ...form, audience: event.target.value as Audience | '' })}
                >
                  <option value="">Choose Men or Women…</option>
                  {AUDIENCES.map((entry) => (
                    <option key={entry} value={entry}>
                      {AUDIENCE_LABEL[entry]}
                    </option>
                  ))}
                </select>
                <Hint>Required before publish. This is the primary shopper filter, not a category.</Hint>
                <FieldError>{fieldError(fieldErrors, 'audience')}</FieldError>
              </div>
              <div>
                <Label htmlFor="w-method">Listing method</Label>
                <select
                  id="w-method"
                  className="field"
                  value={form.listingMethod}
                  disabled={!mayManage}
                  onChange={(event) => {
                    const listingMethod = event.target.value as ListingMethod;
                    const allowed = conditionOptionsFor(listingMethod);
                    const condition: Condition | null = form.condition && allowed.includes(form.condition) ? form.condition : allowed[0] ?? null;
                    setForm({ ...form, listingMethod, condition });
                  }}
                >
                  {(category?.listingMethods.length ? category.listingMethods : LISTING_METHODS).map((method) => (
                    <option key={method} value={method}>
                      {METHOD_LABEL[method]}
                    </option>
                  ))}
                </select>
                <Hint>A published listing is not a live auction: the auction engine arrives in the next phase.</Hint>
                <FieldError>{fieldError(fieldErrors, 'listingMethod')}</FieldError>
              </div>
              {form.listingMethod === 'fixed_price' ? (
                <div>
                  <Label htmlFor="w-price">Price (QAR)</Label>
                  <input
                    id="w-price"
                    className="field"
                    type="number"
                    min={1}
                    step="0.01"
                    disabled={!mayManage}
                    value={form.priceQar}
                    onChange={(event) => setForm({ ...form, priceQar: event.target.value })}
                  />
                  <FieldError>{fieldError(fieldErrors, 'priceMinor')}</FieldError>
                </div>
              ) : null}
              <div>
                <Label htmlFor="w-language">Advertisement language</Label>
                <select id="w-language" className="field" value={form.languageMode} disabled={!mayManage} onChange={(event) => setForm({ ...form, languageMode: event.target.value as LanguageMode })}>
                  <option value="en">English only</option>
                  <option value="ar">Arabic only</option>
                  <option value="both">English and Arabic</option>
                </select>
                <Hint>
                  This is the language of the advertisement itself, not a translation of this interface. Publication
                  requires the content the selected mode promises.
                </Hint>
              </div>
              <div>
                <Label htmlFor="w-condition">Condition</Label>
                <select
                  id="w-condition"
                  className="field"
                  value={form.condition ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => setForm({ ...form, condition: (event.target.value || null) as Condition | null })}
                >
                  <option value="">Not stated</option>
                  {conditionOptionsFor(form.listingMethod).map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
                <FieldError>{fieldError(fieldErrors, 'condition')}</FieldError>
              </div>
              <div>
                <Label htmlFor="w-location">Location</Label>
                <select
                  id="w-location"
                  className="field"
                  value={form.locationKey ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => setForm({ ...form, locationKey: event.target.value || null })}
                >
                  <option value="">No public location</option>
                  {locations.map((location) => (
                    <option key={location.key} value={location.key}>
                      {location.label}
                      {location.active === false ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
                <Hint>The location&apos;s own precision policy decides what the public page shows.</Hint>
                <FieldError>{fieldError(fieldErrors, 'locationKey')}</FieldError>
              </div>
              <div>
                <Label htmlFor="w-featured">Featured</Label>
                <Toggle
                  id="w-featured"
                  label="Show in featured sections"
                  checked={form.featured}
                  onChange={(next) => setForm({ ...form, featured: next })}
                />
                <Hint>Featured placement is a staff decision; the public featured sections read it directly.</Hint>
              </div>
              <div>
                <Label htmlFor="w-notes">Private staff notes</Label>
                <textarea
                  id="w-notes"
                  className="field"
                  rows={3}
                  value={form.adminNotes}
                  disabled={!mayManage}
                  onChange={(event) => setForm({ ...form, adminNotes: event.target.value })}
                />
                <Hint>Never published: this field is stripped from every public and customer response.</Hint>
              </div>
            </div>
            <div className="lw-wizard-actions">
              <PrimaryButton type="button" onClick={() => setStep('content')}>
                Continue to content
              </PrimaryButton>
              {mayManage && (
                <GhostButton disabled={busy || track.status === 'saving'} onClick={() => void save()}>
                  Save now
                </GhostButton>
              )}
            </div>
          </div>
        )}

        {step === 'content' && (
          <div className="adm-form lw-step-panel">
            <p className="lw-address">
              Public address <strong>/product/{(form.title.en ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'listing'}</strong>
            </p>
            <div className="lw-content-grid">
            {requiredLocales(form.languageMode).map((locale) => (
              <div key={locale} className="lw-locale">
                <h3 className="lw-locale-title">{locale === 'en' ? 'English advertisement' : 'Arabic advertisement'}</h3>
                <div>
                  <Label htmlFor={`title-${locale}`}>Title ({locale})</Label>
                  <input
                    id={`title-${locale}`}
                    className="field"
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    maxLength={140}
                    value={form.title[locale] ?? ''}
                    disabled={!mayManage}
                    onChange={(event) => setForm({ ...form, title: { ...form.title, [locale]: event.target.value } })}
                  />
                  <FieldError>{fieldError(fieldErrors, `title.${locale}`)}</FieldError>
                </div>
                <div>
                  <Label htmlFor={`description-${locale}`}>Description ({locale})</Label>
                  <textarea
                    id={`description-${locale}`}
                    className="field"
                    rows={7}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    maxLength={8000}
                    value={form.description[locale] ?? ''}
                    disabled={!mayManage}
                    onChange={(event) => setForm({ ...form, description: { ...form.description, [locale]: event.target.value } })}
                  />
                  <FieldError>{fieldError(fieldErrors, `description.${locale}`)}</FieldError>
                </div>
              </div>
            ))}
            </div>
            {form.languageMode !== 'both' && (
              <Hint>
                This advertisement is {LANGUAGE_MODE_LABEL[form.languageMode].toLowerCase()}. The other language can be
                filled in later; publishing only checks the languages the advertisement promises.
              </Hint>
            )}
            {problems.length > 0 && (
              <ul className="lw-list">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            <div className="lw-wizard-actions">
              <PrimaryButton type="button" onClick={() => setStep('attributes')}>
                Continue to attributes
              </PrimaryButton>
              <GhostButton onClick={() => setStep('basics')}>Back</GhostButton>
              {mayManage && (
                <GhostButton disabled={busy || track.status === 'saving'} onClick={() => void save()}>
                  Save now
                </GhostButton>
              )}
            </div>
          </div>
        )}

        {step === 'attributes' && (
          <div className="adm-form lw-step-panel">
            {!schema && (
              <p className="adm-state">
                {form.categoryKey} has no published attribute schema, so this listing carries no structured attributes.
                Nothing invented here is stored.
              </p>
            )}
            {schema && visible.length === 0 && <p className="adm-state">This schema defines no visible fields.</p>}
            {schema && visible.length > 0 && (
              <div className="adm-grid adm-grid--2">
                {visible.map((entry) => (
                  <div key={entry.key} className={entry.adminOnly ? 'lw-admin-field' : undefined}>
                    <Label htmlFor={`attr-${entry.key}`}>
                      {entry.labelEn}
                      {entry.unit ? ` (${entry.unit})` : ''}
                      {entry.required ? ' *' : ''}
                      {entry.adminOnly ? ' · staff only' : ''}
                    </Label>
                    {entry.type === 'select' && (
                      <select
                        id={`attr-${entry.key}`}
                        className="field"
                        value={String(form.attributes[entry.key] ?? '')}
                        disabled={!mayManage}
                        onChange={(event) => setForm({ ...form, attributes: { ...form.attributes, [entry.key]: event.target.value || null } })}
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
                        id={`attr-${entry.key}`}
                        label={form.attributes[entry.key] === true ? 'Yes' : form.attributes[entry.key] === false ? 'No' : 'Not set'}
                        checked={form.attributes[entry.key] === true}
                        onChange={(next) => setForm({ ...form, attributes: { ...form.attributes, [entry.key]: next } })}
                      />
                    )}
                    {entry.type === 'multiselect' && (
                      <select
                        id={`attr-${entry.key}`}
                        className="field"
                        multiple
                        value={Array.isArray(form.attributes[entry.key]) ? (form.attributes[entry.key] as string[]) : []}
                        disabled={!mayManage}
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
                        id={`attr-${entry.key}`}
                        className="field"
                        inputMode={entry.type === 'number' ? 'decimal' : undefined}
                        type={entry.type === 'date' ? 'date' : 'text'}
                        value={String(form.attributes[entry.key] ?? '')}
                        disabled={!mayManage}
                        onChange={(event) =>
                          setForm({ ...form, attributes: { ...form.attributes, [entry.key]: event.target.value === '' ? null : event.target.value } })
                        }
                      />
                    )}
                    {entry.helpEn && <Hint>{entry.helpEn}</Hint>}
                    <FieldError>{fieldError(fieldErrors, `attributes.${entry.key}`)}</FieldError>
                  </div>
                ))}
              </div>
            )}
            {missingRequired.length > 0 && (
              <ul className="lw-list">
                {missingRequired.map((key) => (
                  <li key={key}>{key} is required by this category&apos;s schema.</li>
                ))}
              </ul>
            )}
            <div className="lw-wizard-actions">
              <PrimaryButton type="button" onClick={() => setStep('media')}>
                Continue to media
              </PrimaryButton>
              <GhostButton onClick={() => setStep('content')}>Back</GhostButton>
              {mayManage && (
                <GhostButton disabled={busy || track.status === 'saving'} onClick={() => void save()}>
                  Save attributes
                </GhostButton>
              )}
            </div>
          </div>
        )}

        {step === 'media' && (
          <div className="adm-form lw-step-panel">
            <div className="lw-media-step">
              <label
                className={mayManage ? 'lw-upload-zone' : 'lw-upload-zone lw-upload-zone--disabled'}
                htmlFor="w-file"
              >
                <p className="lw-upload-zone__title">Drop an image here or click to upload</p>
                <p className="lw-upload-zone__hint">
                  JPEG, PNG, or WebP — one file per upload. The server verifies the file, strips metadata, and rejects
                  anything it cannot treat as a real image.
                </p>
                <input
                  id="w-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="lw-upload-zone__input"
                  disabled={!mayManage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {progress !== null && (
                <div role="status" aria-live="polite">
                  <div className="adm-progress">
                    <span style={{ display: 'block', height: '100%', width: `${progress}%`, background: '#9A6B12' }} />
                  </div>
                  <p className="adm-hint">Uploading… {progress}%</p>
                </div>
              )}
              {assetsError && <ErrorNote>{assetsError}</ErrorNote>}

              <details className="lw-assets-panel">
                <summary>Collection assets ({assets.length})</summary>
                <TableWrap label="Collection assets">
                  <table className="adm-table">
                    <caption>Every upload in this listing&apos;s collection, including the ones the server refused.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Asset</th>
                        <th scope="col">Status</th>
                        <th scope="col">Size</th>
                        <th scope="col">In this listing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => {
                        const attached = form.media.some((entry) => entry.assetId === asset.assetId);
                        return (
                          <tr key={asset.assetId}>
                            <td>{asset.assetId}</td>
                            <td>
                              <Badge tone={asset.status === 'ready' ? 'good' : asset.status === 'failed' ? 'warn' : 'bad'}>{asset.status}</Badge>
                              {asset.statusReason && <div className="adm-hint">{asset.statusReason}</div>}
                            </td>
                            <td>
                              {formatBytes(asset.bytes)}
                              {asset.image ? ` · ${asset.image.width}×${asset.image.height}` : ''}
                            </td>
                            <td>
                              {asset.status === 'ready' ? (
                                <Toggle
                                  id={`attach-${asset.assetId}`}
                                  label="Attached"
                                  checked={attached}
                                  onChange={(next) => {
                                    if (next) {
                                      const media = [...form.media, { assetId: asset.assetId, alt: { en: null, ar: null } }];
                                      setForm({ ...form, media, coverAssetId: coverAfterChange(media, form.coverAssetId) });
                                    } else {
                                      const media = form.media.filter((entry) => entry.assetId !== asset.assetId);
                                      setForm({ ...form, media, coverAssetId: coverAfterChange(media, form.coverAssetId) });
                                    }
                                  }}
                                />
                              ) : (
                                <span className="adm-hint">not available</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrap>
              </details>

              {form.media.length === 0 ? (
                <p className="lw-media-empty">This listing has no images yet. Upload at least one to publish.</p>
              ) : (
                <div className="lw-media-grid" data-testid="lw-media-grid">
                  {form.media.map((entry, index) => {
                    const asset = readyAssets.find((candidate) => candidate.assetId === entry.assetId);
                    return (
                      <figure key={entry.assetId} className="lw-media-card">
                        <div className="lw-media-card__preview">
                          {asset?.url ? (
                            <img src={`${API_BASE_URL}${asset.url}`} alt={entry.alt.en ?? `Photo ${index + 1}`} />
                          ) : (
                            <div className="ph">Preview unavailable</div>
                          )}
                        </div>
                        <div className="lw-media-card__head">
                          <span className="adm-hint" style={css('font-weight: 700; color: #15191E')}>#{index + 1}</span>
                          {form.coverAssetId === entry.assetId && <Badge tone="good">Cover</Badge>}
                        </div>
                        <figcaption className="lw-media-card__body">
                          <div className="lw-media-card__alts">
                            <div>
                              <label className="lbl" htmlFor={`alt-en-${entry.assetId}`}>Alt (EN)</label>
                              <input
                                id={`alt-en-${entry.assetId}`}
                                className="field"
                                value={entry.alt.en ?? ''}
                                disabled={!mayManage}
                                onChange={(event) => {
                                  const media = form.media.map((item) =>
                                    item.assetId === entry.assetId ? { ...item, alt: { ...item.alt, en: event.target.value } } : item,
                                  );
                                  setForm({ ...form, media });
                                }}
                              />
                            </div>
                            <div>
                              <label className="lbl" htmlFor={`alt-ar-${entry.assetId}`}>Alt (AR)</label>
                              <input
                                id={`alt-ar-${entry.assetId}`}
                                className="field"
                                dir="rtl"
                                value={entry.alt.ar ?? ''}
                                disabled={!mayManage}
                                onChange={(event) => {
                                  const media = form.media.map((item) =>
                                    item.assetId === entry.assetId ? { ...item, alt: { ...item.alt, ar: event.target.value } } : item,
                                  );
                                  setForm({ ...form, media });
                                }}
                              />
                            </div>
                          </div>
                          <div className="lw-media-card__actions">
                            <GhostButton title="Move earlier" disabled={index === 0 || !mayManage} onClick={() => setForm({ ...form, media: moveMedia(form.media, index, index - 1) })}>
                              ↑
                            </GhostButton>
                            <GhostButton
                              title="Move later"
                              disabled={index === form.media.length - 1 || !mayManage}
                              onClick={() => setForm({ ...form, media: moveMedia(form.media, index, index + 1) })}
                            >
                              ↓
                            </GhostButton>
                            <GhostButton
                              disabled={form.coverAssetId === entry.assetId || !mayManage}
                              onClick={() => setForm({ ...form, coverAssetId: coverAfterChange(form.media, entry.assetId) })}
                            >
                              Cover
                            </GhostButton>
                            <GhostButton
                              disabled={!mayManage}
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
              <FieldError>{fieldError(fieldErrors, 'media') ?? fieldError(fieldErrors, 'coverAssetId')}</FieldError>
            </div>

            <div className="lw-wizard-actions">
              <PrimaryButton type="button" onClick={() => setStep('review')}>
                Continue to review
              </PrimaryButton>
              <GhostButton onClick={() => setStep('attributes')}>Back</GhostButton>
              {mayManage && (
                <GhostButton disabled={busy || track.status === 'saving'} onClick={() => void save()}>
                  Save media order
                </GhostButton>
              )}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="adm-form lw-step-panel">
            <div className="adm-grid adm-grid--2">
              <div>
                <div className="lbl">Record</div>
                <p className="adm-hint">
                  {listing.listingReference} · version {track.version} · {listing.status}
                </p>
              </div>
              <div>
                <div className="lbl">Content language</div>
                <p className="adm-hint">
                  {LANGUAGE_MODE_LABEL[form.languageMode]} — {form.title.en ? 'English title set' : 'no English title'},{' '}
                  {form.title.ar ? 'Arabic title set' : 'no Arabic title'}
                </p>
              </div>
              <div>
                <div className="lbl">Images</div>
                <p className="adm-hint">
                  {form.media.length} attached
                  {form.coverAssetId ? `, cover ${form.coverAssetId}` : ', no cover'}
                </p>
              </div>
              <div>
                <div className="lbl">References</div>
                <p className="adm-hint">
                  category {form.categoryKey} ·{' '}
                  {form.locationKey ? `location ${form.locationKey}` : 'no public location'}
                </p>
              </div>
            </div>

            <div className="lw-checklist">
              <p className={problems.length === 0 ? 'lw-check ok' : 'lw-check bad'}>
                {problems.length === 0 ? 'Advertisement language is complete' : problems.join(' · ')}
              </p>
              <p className={form.media.length > 0 ? 'lw-check ok' : 'lw-check bad'}>
                {form.media.length > 0 ? 'At least one image attached' : 'Publication needs at least one image'}
              </p>
              <p className={missingRequired.length === 0 ? 'lw-check ok' : 'lw-check bad'}>
                {missingRequired.length === 0 ? 'Required attributes are set' : `Missing required attributes: ${missingRequired.join(', ')}`}
              </p>
              {schemaChanged && <p className="lw-check bad">The category schema changed; save the attributes step first.</p>}
              {listing.status === 'published' && <p className="lw-check ok">Already published — public URL {listing.publicUrl}</p>}
              {listing.status === 'archived' && <p className="lw-check bad">This listing is archived and currently invisible to the public.</p>}
            </div>

            <Hint>
              These checks are guidance for the operator. The server re-validates every reference, attribute and image
              on publication, and its refusal is what counts.
            </Hint>

            <div className="lw-wizard-actions">
              {mayManage && listing.status !== 'published' && listing.status !== 'archived' && (
                <PrimaryButton type="button" disabled={busy || !confirmingPublish} onClick={() => void publish()}>
                  Publish listing
                </PrimaryButton>
              )}
              {mayManage && listing.status === 'archived' && (
                <PrimaryButton type="button" disabled={busy || !confirmingPublish} onClick={() => void publish()}>
                  Publish again
                </PrimaryButton>
              )}
              {listing.status === 'published' && (
                <Link href={listing.publicUrl} style={css('font-weight: 600')}>
                  View the public page →
                </Link>
              )}
              <GhostButton onClick={() => setStep('media')}>Back</GhostButton>
              {mayManage && (
                <GhostButton disabled={busy || track.status === 'saving'} onClick={() => void save()}>
                  Save draft
                </GhostButton>
              )}
            </div>

            {mayManage && listing.status !== 'published' && (
              <div style={css('padding-top: 12px; border-top: 1px solid #EEECE7; display: flex; flex-wrap: wrap; gap: 12px; align-items: center')}>
                <Toggle id="confirm-publish" label="I reviewed the content, images and references" checked={confirmingPublish} onChange={setConfirmingPublish} />
              </div>
            )}

            {mayManage && listing.status !== 'archived' && (
              <form
                className="adm-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  void archive();
                }}
              >
                <div className="adm-filter">
                  <Label htmlFor="w-archive">Archive reason</Label>
                  <input id="w-archive" className="field" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} placeholder="Why is this listing coming down?" />
                </div>
                <div className="adm-actions">
                  <GhostButton disabled={busy} onClick={() => void archive()}>
                    Archive listing
                  </GhostButton>
                </div>
                <Hint>Archiving removes it from public view and keeps its history. Publication can be repeated later.</Hint>
              </form>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Server state" subtitle="What the record actually says, including the fields the public never sees.">
        <StateBlock loading={false} error={null}>
          <dl className="adm-grid" style={css('margin: 0; font-size: 14px')}>
            <div>
              <dt className="lbl">Status</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.status}</dd>
            </div>
            <div>
              <dt className="lbl">Moderation</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.moderation.state}</dd>
            </div>
            <div>
              <dt className="lbl">Attribute schema</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.attributeSchemaVersion ?? '—'}</dd>
            </div>
            <div>
              <dt className="lbl">Media collection</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.mediaCollectionKey}</dd>
            </div>
            <div>
              <dt className="lbl">Created by</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.createdBy}</dd>
            </div>
            <div>
              <dt className="lbl">Updated by</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.updatedBy ?? '—'}</dd>
            </div>
            <div>
              <dt className="lbl">Published</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.publishedAt ? new Date(listing.publishedAt).toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt className="lbl">Archived reason</dt>
              <dd style={css('margin: 4px 0 0')}>{listing.archivedReason ?? '—'}</dd>
            </div>
          </dl>
        </StateBlock>
      </Panel>
    </div>
  );
}
