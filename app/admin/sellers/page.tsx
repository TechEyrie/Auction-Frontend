'use client';

import { useState } from 'react';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import { useAsync } from '../../../lib/useAsync';
import { fieldError } from '../../../lib/admin';
import {
  Badge,
  ErrorNote,
  FieldError,
  GhostButton,
  Hint,
  Label,
  Panel,
  PrimaryButton,
  StateBlock,
  TableWrap,
} from '../ui';

type VerificationState = 'unverified' | 'pending' | 'verified' | 'rejected';
type SellerStatus = 'active' | 'inactive' | 'archived';

type Seller = {
  sellerReference: string;
  type: 'individual' | 'company';
  displayName: string;
  legalName: string | null;
  status: SellerStatus;
  verificationBadge: boolean;
  memberSince: string;
  contact: { contactName: string | null; phone: string; email: string | null };
  address: {
    line1: string | null;
    line2: string | null;
    locationKey: string | null;
    postalCode: string | null;
    publicPrecision: 'hidden' | 'city' | 'exact';
  };
  verification: {
    state: VerificationState;
    evidence: Array<{ kind: string; reference: string; note: string | null; addedAt: string; addedBy: string }>;
    lastActor: string | null;
    lastChangedAt: string | null;
    rejectionReason: string | null;
  };
  internalNotes: string | null;
  linkedUser: boolean;
  settlement: {
    method: 'bank_transfer' | 'cheque' | 'cash' | 'not_set';
    accountName: string | null;
    bankName: string | null;
    ibanMasked: string | null;
    notes: string | null;
  } | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type SellerPage = { sellers: Seller[]; page: number; limit: number; total: number; totalPages: number };
type PublicSeller = { sellerReference: string; type: string; displayName: string; verificationBadge: boolean; memberSince: string };

const STATUS_TONE: Record<SellerStatus, 'good' | 'neutral' | 'bad'> = {
  active: 'good',
  inactive: 'neutral',
  archived: 'bad',
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
 * Offline sellers.
 *
 * Sellers here are records, not accounts: nothing on this screen creates a login, and the
 * public preview shows exactly what a marketplace visitor would see, so the redaction is
 * visible rather than assumed. Settlement instructions are only rendered when the session
 * holds a settlement/finance capability, and the server refuses the write regardless.
 */
export default function AdminSellersPage() {
  const session = useSession();
  const mayManageSettlement = session.capabilities.includes('settlements.manage') || session.capabilities.includes('finance.manage');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [verification, setVerification] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ search: '', status: '', type: '', verification: '' });

  const list = useAsync<SellerPage>(
    () =>
      apiFetch<SellerPage>(
        `/api/admin/sellers?${new URLSearchParams({
          page: String(page),
          limit: '20',
          ...(query.search ? { search: query.search } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.type ? { type: query.type } : {}),
          ...(query.verification ? { verification: query.verification } : {}),
        }).toString()}`,
        { cache: 'no-store' },
      ),
    [page, query],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const seller = list.data?.sellers.find((item) => item.sellerReference === selected) ?? null;
  const [creating, setCreating] = useState(false);

  return (
    <div style={css('display: flex; flex-direction: column; gap: 20px')}>
      <Panel
        title="Offline sellers"
        subtitle="Records created by staff for people who sell without an account. No account is created here."
        actions={
          <GhostButton onClick={() => setCreating((value) => !value)}>
            {creating ? 'Close new seller form' : 'New seller'}
          </GhostButton>
        }
      >
        {creating && (
          <CreateSellerForm
            onCancel={() => setCreating(false)}
            onCreated={(created) => {
              setCreating(false);
              setSelected(created.sellerReference);
              list.reload();
            }}
          />
        )}

        <form
          className="adm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery({ search, status, type, verification });
          }}
        >
          <div className="adm-filter">
            <Label htmlFor="seller-search">Search</Label>
            <input id="seller-search" className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or reference" />
          </div>
          <div className="adm-filter">
            <Label htmlFor="seller-status">Status</Label>
            <select id="seller-status" className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="seller-type">Type</Label>
            <select id="seller-type" className="field" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Any</option>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div className="adm-filter">
            <Label htmlFor="seller-verification">Verification</Label>
            <select id="seller-verification" className="field" value={verification} onChange={(event) => setVerification(event.target.value)}>
              <option value="">Any</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="adm-actions">
            <PrimaryButton>Apply filters</PrimaryButton>
            <GhostButton
              onClick={() => {
                setSearch('');
                setStatus('');
                setType('');
                setVerification('');
                setPage(1);
                setQuery({ search: '', status: '', type: '', verification: '' });
              }}
            >
              Clear
            </GhostButton>
          </div>
        </form>

        <StateBlock
          loading={list.loading}
          error={list.error}
          empty={(list.data?.sellers.length ?? 0) === 0}
          emptyText="No sellers match these filters yet."
          onRetry={list.reload}
        >
          <TableWrap label="Sellers">
            <table className="adm-table">
              <caption>
                {list.data?.total ?? 0} seller(s) · page {list.data?.page ?? 1} of {list.data?.totalPages ?? 1}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.sellers.map((item) => (
                  <tr key={item.sellerReference} aria-selected={item.sellerReference === selected}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelected(item.sellerReference === selected ? null : item.sellerReference)}
                        style={css('border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: #9A6B12; cursor: pointer')}
                      >
                        {item.sellerReference}
                      </button>
                    </td>
                    <td className="wrap">{item.displayName}</td>
                    <td>{item.type}</td>
                    <td>
                      <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                    </td>
                    <td>
                      <Badge tone={item.verification.state === 'verified' ? 'good' : item.verification.state === 'rejected' ? 'bad' : 'warn'}>
                        {item.verification.state}
                      </Badge>
                    </td>
                    <td>{item.contact.phone}</td>
                    <td>{new Date(item.updatedAt).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {(list.data?.totalPages ?? 1) > 1 && (
            <nav className="adm-pager" aria-label="Seller pages">
              <span>
                Page {list.data?.page ?? 1} of {list.data?.totalPages ?? 1}
              </span>
              <div className="adm-actions">
                <GhostButton onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={(list.data?.page ?? 1) <= 1}>
                  Previous
                </GhostButton>
                <GhostButton onClick={() => setPage((value) => Math.min(list.data?.totalPages ?? 1, value + 1))} disabled={(list.data?.page ?? 1) >= (list.data?.totalPages ?? 1)}>
                  Next
                </GhostButton>
              </div>
            </nav>
          )}
        </StateBlock>
      </Panel>

      {seller && (
        <SellerDetail
          seller={seller}
          mayManageSettlement={mayManageSettlement}
          onChanged={() => list.reload()}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function CreateSellerForm({ onCreated, onCancel }: { onCreated: (seller: Seller) => void; onCancel: () => void }) {
  const session = useSession();
  const [form, setForm] = useState({
    type: 'individual',
    displayName: '',
    legalName: '',
    contactName: '',
    phone: '',
    email: '',
    line1: '',
    locationKey: '',
    internalNotes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="adm-form"
      style={css('border: 1px solid #E6E4DF; border-radius: 12px; padding: 16px; margin-bottom: 18px; background: #FBFAF7')}
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        setFields({});
        try {
          const created = await apiFetch<{ seller: Seller }>('/api/admin/sellers', {
            method: 'POST',
            headers: session.authHeaders(),
            json: {
              type: form.type,
              displayName: form.displayName,
              legalName: form.legalName || null,
              contact: { contactName: form.contactName || null, phone: form.phone, email: form.email || null },
              address: { line1: form.line1 || null, locationKey: form.locationKey || null },
              internalNotes: form.internalNotes || null,
            },
          });
          onCreated(created.seller);
        } catch (err) {
          setError(apiMessage(err));
          setFields(fieldErrorsOf(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700")}>New offline seller</h3>
      <ErrorNote>{error}</ErrorNote>
      <div className="adm-grid">
        <div>
          <Label htmlFor="new-seller-type">Type</Label>
          <select id="new-seller-type" className="field" value={form.type} onChange={(event) => update('type')(event.target.value)}>
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
          <FieldError>{fieldError(fields, 'type')}</FieldError>
        </div>
        <div>
          <Label htmlFor="new-seller-name">Display name</Label>
          <input id="new-seller-name" className="field" value={form.displayName} onChange={(event) => update('displayName')(event.target.value)} />
          <FieldError>{fieldError(fields, 'displayName')}</FieldError>
        </div>
        <div>
          <Label htmlFor="new-seller-legal">Legal name</Label>
          <input id="new-seller-legal" className="field" value={form.legalName} onChange={(event) => update('legalName')(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-seller-phone">Contact phone</Label>
          <input id="new-seller-phone" className="field" value={form.phone} onChange={(event) => update('phone')(event.target.value)} placeholder="+974…" />
          <FieldError>{fieldError(fields, 'contact') ?? fieldError(fields, 'contact.phone')}</FieldError>
        </div>
        <div>
          <Label htmlFor="new-seller-email">Contact email</Label>
          <input id="new-seller-email" className="field" value={form.email} onChange={(event) => update('email')(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-seller-line1">Address line</Label>
          <input id="new-seller-line1" className="field" value={form.line1} onChange={(event) => update('line1')(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-seller-location">Location key</Label>
          <input id="new-seller-location" className="field" value={form.locationKey} onChange={(event) => update('locationKey')(event.target.value)} placeholder="qa-doha-al-sadd" />
          <Hint>Optional. Any public-precision policy for that location still applies.</Hint>
        </div>
      </div>
      <div>
        <Label htmlFor="new-seller-notes">Internal notes</Label>
        <textarea id="new-seller-notes" className="field" rows={3} value={form.internalNotes} onChange={(event) => update('internalNotes')(event.target.value)} />
        <Hint>Staff-only. Never returned to a public caller.</Hint>
      </div>
      <div className="adm-actions">
        <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Create seller'}</PrimaryButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </form>
  );
}

function SellerDetail({
  seller,
  mayManageSettlement,
  onChanged,
  onClose,
}: {
  seller: Seller;
  mayManageSettlement: boolean;
  onChanged: () => void;
  onClose: () => void;
}) {
  const session = useSession();
  const [detail, setDetail] = useState<Seller>(seller);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [edit, setEdit] = useState({
    displayName: seller.displayName,
    legalName: seller.legalName ?? '',
    phone: seller.contact.phone,
    email: seller.contact.email ?? '',
    line1: seller.address.line1 ?? '',
    locationKey: seller.address.locationKey ?? '',
    publicPrecision: seller.address.publicPrecision,
    internalNotes: seller.internalNotes ?? '',
  });
  const [verificationForm, setVerificationForm] = useState({ state: seller.verification.state, reason: '', evidenceKind: '', evidenceReference: '' });
  const [statusForm, setStatusForm] = useState({ status: seller.status, reason: '' });
  const [settlementForm, setSettlementForm] = useState<{
    method: 'bank_transfer' | 'cheque' | 'cash' | 'not_set';
    accountName: string;
    bankName: string;
    iban: string;
  }>({ method: seller.settlement?.method ?? 'not_set', accountName: '', bankName: '', iban: '' });

  const publicView = useAsync<{ seller: PublicSeller }>(
    () => apiFetch<{ seller: PublicSeller }>(`/api/catalog/sellers/${seller.sellerReference}`, { cache: 'no-store' }),
    [seller.sellerReference],
  );

  async function send(path: string, json: unknown, method: 'PATCH' | 'POST' = 'PATCH', successNotice?: string) {
    setBusy(true);
    setError(null);
    setFields({});
    setNotice(null);
    try {
      const result = await apiFetch<{ seller: Seller }>(path, { method, headers: session.authHeaders(), json });
      setDetail(result.seller);
      setNotice(successNotice ?? 'Saved.');
      onChanged();
    } catch (err) {
      setError(apiMessage(err));
      setFields(fieldErrorsOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={`Seller ${detail.sellerReference}`}
      subtitle={`${detail.type} · created ${new Date(detail.createdAt).toISOString().slice(0, 10)} by ${detail.createdBy}`}
      actions={
        <>
          <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
          <Badge tone={detail.verification.state === 'verified' ? 'good' : detail.verification.state === 'rejected' ? 'bad' : 'warn'}>
            {detail.verification.state}
          </Badge>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </>
      }
    >
      <div style={css('display: flex; flex-direction: column; gap: 18px')}>
        <ErrorNote>{error}</ErrorNote>
        {notice && <p className="adm-note" data-tone="good">{notice}</p>}

        <div className="adm-grid">
          <div>
            <h3 style={css('margin: 0 0 8px; font-size: 15px; font-weight: 700')}>Public view</h3>
            <StateBlock loading={publicView.loading} error={publicView.error} onRetry={publicView.reload}>
              <ul style={css('margin: 0; padding-left: 18px; color: #5B636B; font-size: 14px')}>
                <li>name: {publicView.data?.seller.displayName}</li>
                <li>type: {publicView.data?.seller.type}</li>
                <li>verified badge: {String(publicView.data?.seller.verificationBadge)}</li>
                <li>contact/address/notes: not exposed</li>
              </ul>
            </StateBlock>
          </div>
          <div>
            <h3 style={css('margin: 0 0 8px; font-size: 15px; font-weight: 700')}>Verification history</h3>
            {detail.verification.evidence.length === 0 ? (
              <p className="adm-hint">No evidence recorded.</p>
            ) : (
              <ul style={css('margin: 0; padding-left: 18px; color: #5B636B; font-size: 14px')}>
                {detail.verification.evidence.map((item) => (
                  <li key={`${item.kind}-${item.reference}`}>
                    {item.kind}: {item.reference} — {item.addedBy} ({item.addedAt.slice(0, 10)})
                  </li>
                ))}
              </ul>
            )}
            {detail.verification.lastActor && (
              <p className="adm-hint">
                Last change by {detail.verification.lastActor} on {detail.verification.lastChangedAt?.slice(0, 10)}
              </p>
            )}
          </div>
        </div>

        {!session.capabilities.includes('inventory.manage') ? (
          <p className="adm-state" data-state="empty">
            Your account can view sellers but not edit them.
          </p>
        ) : (
          <>
            <form
              className="adm-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await send(`/api/admin/sellers/${detail.sellerReference}`, {
                  displayName: edit.displayName,
                  legalName: edit.legalName || null,
                  contact: { phone: edit.phone, email: edit.email || null },
                  address: { line1: edit.line1 || null, locationKey: edit.locationKey || null, publicPrecision: edit.publicPrecision },
                  internalNotes: edit.internalNotes || null,
                });
              }}
            >
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700")}>Details</h3>
              <div className="adm-grid">
                <div>
                  <Label htmlFor="edit-display-name">Display name</Label>
                  <input id="edit-display-name" className="field" value={edit.displayName} onChange={(event) => setEdit({ ...edit, displayName: event.target.value })} />
                  <FieldError>{fieldError(fields, 'displayName')}</FieldError>
                </div>
                <div>
                  <Label htmlFor="edit-legal-name">Legal name</Label>
                  <input id="edit-legal-name" className="field" value={edit.legalName} onChange={(event) => setEdit({ ...edit, legalName: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <input id="edit-phone" className="field" value={edit.phone} onChange={(event) => setEdit({ ...edit, phone: event.target.value })} />
                  <FieldError>{fieldError(fields, 'contact.phone')}</FieldError>
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <input id="edit-email" className="field" value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-address">Address line</Label>
                  <input id="edit-address" className="field" value={edit.line1} onChange={(event) => setEdit({ ...edit, line1: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-location">Location key</Label>
                  <input id="edit-location" className="field" value={edit.locationKey} onChange={(event) => setEdit({ ...edit, locationKey: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-precision">Public precision</Label>
                  <select id="edit-precision" className="field" value={edit.publicPrecision} onChange={(event) => setEdit({ ...edit, publicPrecision: event.target.value as typeof edit.publicPrecision })}>
                    <option value="hidden">hidden</option>
                    <option value="city">city</option>
                    <option value="exact">exact (owner-approved only)</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-notes">Internal notes</Label>
                <textarea id="edit-notes" className="field" rows={3} value={edit.internalNotes} onChange={(event) => setEdit({ ...edit, internalNotes: event.target.value })} />
              </div>
              <PrimaryButton disabled={busy}>{busy ? 'Saving…' : 'Save details'}</PrimaryButton>
            </form>

            <form
              className="adm-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await send(
                  `/api/admin/sellers/${detail.sellerReference}/verification`,
                  {
                    state: verificationForm.state,
                    reason: verificationForm.reason,
                    ...(verificationForm.evidenceKind && verificationForm.evidenceReference
                      ? { evidence: [{ kind: verificationForm.evidenceKind, reference: verificationForm.evidenceReference }] }
                      : {}),
                  },
                  'PATCH',
                  'Verification updated.',
                );
              }}
            >
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700")}>Verification</h3>
              <Hint>Every change needs a reason and is audited with your account reference.</Hint>
              <div className="adm-grid">
                <div>
                  <Label htmlFor="verify-state">State</Label>
                  <select id="verify-state" className="field" value={verificationForm.state} onChange={(event) => setVerificationForm({ ...verificationForm, state: event.target.value as VerificationState })}>
                    <option value="unverified">unverified</option>
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="verify-reason">Reason</Label>
                  <input id="verify-reason" className="field" value={verificationForm.reason} onChange={(event) => setVerificationForm({ ...verificationForm, reason: event.target.value })} />
                  <FieldError>{fieldError(fields, 'reason')}</FieldError>
                </div>
                <div>
                  <Label htmlFor="verify-kind">Evidence kind</Label>
                  <input id="verify-kind" className="field" value={verificationForm.evidenceKind} onChange={(event) => setVerificationForm({ ...verificationForm, evidenceKind: event.target.value })} placeholder="trade_licence" />
                </div>
                <div>
                  <Label htmlFor="verify-ref">Evidence reference</Label>
                  <input id="verify-ref" className="field" value={verificationForm.evidenceReference} onChange={(event) => setVerificationForm({ ...verificationForm, evidenceReference: event.target.value })} />
                  <FieldError>{fieldError(fields, 'evidence')}</FieldError>
                </div>
              </div>
              <PrimaryButton disabled={busy}>Record verification</PrimaryButton>
            </form>

            <form
              className="adm-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await send(
                  `/api/admin/sellers/${detail.sellerReference}/status`,
                  { status: statusForm.status, reason: statusForm.reason },
                  'PATCH',
                  'Status updated.',
                );
              }}
            >
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700")}>Status</h3>
              <div className="adm-grid">
                <div>
                  <Label htmlFor="status-state">Status</Label>
                  <select id="status-state" className="field" value={statusForm.status} onChange={(event) => setStatusForm({ ...statusForm, status: event.target.value as SellerStatus })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status-reason">Reason</Label>
                  <input id="status-reason" className="field" value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} />
                  <FieldError>{fieldError(fields, 'reason')}</FieldError>
                </div>
              </div>
              <PrimaryButton disabled={busy}>Change status</PrimaryButton>
            </form>

            <section className="adm-form">
              <h3 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700")}>Settlement instructions</h3>
              {!mayManageSettlement ? (
                <p className="adm-state" data-state="empty">
                  Restricted: settlement instructions need the settlements.manage capability.
                </p>
              ) : detail.settlement ? (
                <>
                  <dl style={css('margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 15px')}>
                    <div>
                      <dt style={css('font-weight: 700; color: #5B636B; font-size: 13px; text-transform: uppercase')}>Method</dt>
                      <dd style={css('margin: 4px 0 0')}>{detail.settlement.method}</dd>
                    </div>
                    <div>
                      <dt style={css('font-weight: 700; color: #5B636B; font-size: 13px; text-transform: uppercase')}>Account name</dt>
                      <dd style={css('margin: 4px 0 0')}>{detail.settlement.accountName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt style={css('font-weight: 700; color: #5B636B; font-size: 13px; text-transform: uppercase')}>Bank</dt>
                      <dd style={css('margin: 4px 0 0')}>{detail.settlement.bankName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt style={css('font-weight: 700; color: #5B636B; font-size: 13px; text-transform: uppercase')}>IBAN</dt>
                      <dd style={css('margin: 4px 0 0')}>{detail.settlement.ibanMasked ?? '—'}</dd>
                    </div>
                  </dl>
                  <form
                    className="adm-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await send(
                        `/api/admin/sellers/${detail.sellerReference}`,
                        {
                          settlement: {
                            method: settlementForm.method,
                            accountName: settlementForm.accountName || null,
                            bankName: settlementForm.bankName || null,
                            iban: settlementForm.iban || null,
                          },
                        },
                        'PATCH',
                        'Settlement instructions updated.',
                      );
                      setSettlementForm({ ...settlementForm, iban: '' });
                    }}
                  >
                    <div className="adm-grid">
                      <div>
                        <Label htmlFor="settle-method">Method</Label>
                        <select
                          id="settle-method"
                          className="field"
                          value={settlementForm.method}
                          onChange={(event) => setSettlementForm({ ...settlementForm, method: event.target.value as typeof settlementForm.method })}
                        >
                          <option value="not_set">not set</option>
                          <option value="bank_transfer">bank transfer</option>
                          <option value="cheque">cheque</option>
                          <option value="cash">cash</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="settle-name">Account name</Label>
                        <input id="settle-name" className="field" value={settlementForm.accountName} onChange={(event) => setSettlementForm({ ...settlementForm, accountName: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="settle-bank">Bank</Label>
                        <input id="settle-bank" className="field" value={settlementForm.bankName} onChange={(event) => setSettlementForm({ ...settlementForm, bankName: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="settle-iban">IBAN</Label>
                        <input id="settle-iban" className="field" value={settlementForm.iban} onChange={(event) => setSettlementForm({ ...settlementForm, iban: event.target.value })} />
                        <Hint>Stored but never returned in full — only the last four characters are readable.</Hint>
                      </div>
                    </div>
                    <PrimaryButton disabled={busy}>Save settlement instructions</PrimaryButton>
                  </form>
                </>
              ) : (
                <p className="adm-state" data-state="empty">
                  Not available for this session.
                </p>
              )}
            </section>
          </>
        )}

        <dl className="adm-grid" style={css('margin: 0; font-size: 14px; color: #5B636B')}>
          <div>
            <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>Linked user account</dt>
            <dd style={css('margin: 4px 0 0')}>{detail.linkedUser ? 'linked' : 'none (offline seller)'}</dd>
          </div>
          <div>
            <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>Member since</dt>
            <dd style={css('margin: 4px 0 0')}>{new Date(detail.memberSince).toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt style={css('font-weight: 700; text-transform: uppercase; font-size: 12px')}>Last updated by</dt>
            <dd style={css('margin: 4px 0 0')}>{detail.updatedBy ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
