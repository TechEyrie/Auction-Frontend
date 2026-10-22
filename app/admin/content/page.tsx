'use client';

import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../../lib/api';
import { css } from '../../../lib/css';
import { useSession } from '../../../lib/session';
import {
  ABOUT_CMS_META,
  ACCOUNT_CMS_META,
  ACCOUNT_MFA_CMS_META,
  AUCTIONS_CMS_META,
  BROWSE_CMS_META,
  CALENDAR_CMS_META,
  CATEGORIES_CMS_META,
  HOME_CMS_META,
  PRODUCT_CMS_META,
  CREATE_ACCOUNT_CMS_META,
  FORGOT_CMS_META,
  FOOTER_CMS_META,
  HEADER_CMS_META,
  RESET_CMS_META,
  SIGN_IN_CMS_META,
  CONTACT_CMS_META,
  defaultLabelPreview,
  emptyChromeForm,
  HELP_CMS_META,
  invalidateSiteChromeCache,
  LEGAL_CMS_META,
  mergeChromeForm,
  type ChromeBody,
  type ChromeDocKey,
  type ChromeFieldMeta,
} from '../../../lib/siteChrome';
import { PageHeader, Panel, StateBlock } from '../ui';

type ChromeDocResponse = {
  key: string;
  version: number;
  body: ChromeBody;
};

function ChromeSection({
  docKey,
  title,
  subtitle,
  fields,
  meta,
}: {
  docKey: ChromeDocKey;
  title: string;
  subtitle: string;
  fields: readonly string[];
  meta: ChromeFieldMeta[];
}) {
  const [form, setForm] = useState<ChromeBody>(() => emptyChromeForm(fields));
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const session = useSession();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const doc = await apiFetch<ChromeDocResponse>(`/api/content/${docKey}`);
      setForm(mergeChromeForm(doc.body, fields));
      setVersion(doc.version);
    } catch {
      setForm(emptyChromeForm(fields));
      setVersion(null);
    } finally {
      setLoading(false);
    }
  }, [docKey, fields]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSaveError(null);
    setSaved(null);
    try {
      const payload: ChromeBody = { en: {}, ar: {} };
      for (const key of fields) {
        payload.en[key] = form.en[key]?.trim() ?? '';
        payload.ar[key] = form.ar[key]?.trim() ?? '';
      }
      const result = await apiFetch<{ version: number }>('/api/admin/content', {
        method: 'POST',
        json: { key: docKey, en: payload.en, ar: payload.ar },
        headers: session.authHeaders(),
      });
      setVersion(result.version);
      invalidateSiteChromeCache(docKey);
      setSaved('Saved and published.');
      void load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={title}
      actions={
        version !== null ? (
          <span className="adm-hint">Published version {version}</span>
        ) : (
          <span className="adm-hint">Not published yet — defaults from site copy</span>
        )
      }
    >
      <p className="adm-hint" style={css('margin: 0 0 16px')}>{subtitle}</p>
      <StateBlock loading={loading} error={loadError} onRetry={() => void load()}>
        <form onSubmit={onSave} style={css('display: flex; flex-direction: column; gap: 20px')}>
          {meta.map((field, index) => (
            <Fragment key={field.key}>
            {field.group && (index === 0 || meta[index - 1]?.group !== field.group) ? (
              <h3 style={css('margin: 16px 0 0; font-size: 18px; font-weight: 700; color: #15191E')}>{field.group}</h3>
            ) : null}
            <div
              style={css('border: 1px solid #E6E4DF; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; background: #FBFAF7')}
            >
              <div>
                <div style={css('font-weight: 700; color: #15191E; font-size: 16px')}>{field.label}</div>
                {field.hint ? <div className="adm-hint">{field.hint}</div> : null}
              </div>
              <div style={css('display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))')}>
                {(['en', 'ar'] as const).map((locale) => {
                  const fallback = defaultLabelPreview(locale, field.key);
                  const longCopy = defaultLabelPreview('en', field.key).length > 80;
                  const shared = {
                    className: 'field',
                    dir: locale === 'ar' ? 'rtl' as const : undefined,
                    value: form[locale][field.key] ?? '',
                    placeholder: fallback,
                    onChange: (event: { target: { value: string } }) =>
                      setForm({
                        ...form,
                        [locale]: { ...form[locale], [field.key]: event.target.value },
                      }),
                  };
                  return (
                    <label key={locale} style={css('display: flex; flex-direction: column; gap: 6px; font-size: 14px')}>
                      <span style={css('font-weight: 600')}>{locale === 'en' ? 'English' : 'Arabic'}</span>
                      {longCopy ? <textarea {...shared} rows={4} /> : <input {...shared} />}
                      <span className="adm-hint">Leave empty to keep: {fallback}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            </Fragment>
          ))}
          {saveError ? <p role="alert" style={css('margin: 0; color: #8A3B05')}>{saveError}</p> : null}
          {saved ? <p role="status" style={css('margin: 0; color: #2F6B3A; font-weight: 600')}>{saved}</p> : null}
          <button
            type="submit"
            disabled={busy}
            style={css('align-self: flex-start; height: 48px; padding: 0 22px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}
          >
            {busy ? 'Saving…' : `Save ${title.toLowerCase()}`}
          </button>
        </form>
      </StateBlock>
    </Panel>
  );
}

type LabelNavItem = {
  id: string;
  label: string;
  subtitle: string;
  docKey: ChromeDocKey;
  fields: readonly string[];
  meta: ChromeFieldMeta[];
};

const LABEL_NAV: LabelNavItem[] = [
  {
    id: 'header',
    label: 'Header',
    subtitle: 'Logo, menus, search, and place filter. Sign in / Sign out buttons are under Sign in / Sign out.',
    docKey: 'header',
    fields: HEADER_CMS_META.map((field) => field.key),
    meta: HEADER_CMS_META,
  },
  {
    id: 'footer',
    label: 'Footer',
    subtitle: 'Brand block, link columns, and the bottom bar — same order as on the site.',
    docKey: 'footer',
    fields: FOOTER_CMS_META.map((field) => field.key),
    meta: FOOTER_CMS_META,
  },
  {
    id: 'signin',
    label: 'Sign in / Sign out',
    subtitle: 'Login form, plus the Sign out button in the header after login. New accounts are under Create account.',
    docKey: 'auth',
    fields: SIGN_IN_CMS_META.map((field) => field.key),
    meta: SIGN_IN_CMS_META,
  },
  {
    id: 'register',
    label: 'Create account',
    subtitle: 'The Create account tab on the same page as Sign in.',
    docKey: 'auth',
    fields: CREATE_ACCOUNT_CMS_META.map((field) => field.key),
    meta: CREATE_ACCOUNT_CMS_META,
  },
  {
    id: 'forgot',
    label: 'Forgot password',
    subtitle: 'The forgot-password page: left panel, email form, and success message.',
    docKey: 'auth',
    fields: FORGOT_CMS_META.map((field) => field.key),
    meta: FORGOT_CMS_META,
  },
  {
    id: 'reset',
    label: 'Reset password',
    subtitle: 'The reset-password page: new password form and invalid-link state.',
    docKey: 'auth',
    fields: RESET_CMS_META.map((field) => field.key),
    meta: RESET_CMS_META,
  },
  {
    id: 'account-mfa',
    label: 'Account authenticator',
    subtitle: 'Two-step verification when signing in, plus replace-authenticator on the Account page.',
    docKey: 'auth',
    fields: ACCOUNT_MFA_CMS_META.map((field) => field.key),
    meta: ACCOUNT_MFA_CMS_META,
  },
  {
    id: 'home',
    label: 'Home',
    subtitle: 'Hero, ending soon, categories, auctions, how it works, and trust blocks on /.',
    docKey: 'home',
    fields: HOME_CMS_META.map((field) => field.key),
    meta: HOME_CMS_META,
  },
  {
    id: 'browse',
    label: 'Browse',
    subtitle: 'Search, filters, results, and pagination on /browse.',
    docKey: 'browse',
    fields: BROWSE_CMS_META.map((field) => field.key),
    meta: BROWSE_CMS_META,
  },
  {
    id: 'auctions',
    label: 'Auctions',
    subtitle: 'Intro, how bidding works, and the live auctions list on /auctions.',
    docKey: 'auctions',
    fields: AUCTIONS_CMS_META.map((field) => field.key),
    meta: AUCTIONS_CMS_META,
  },
  {
    id: 'calendar',
    label: 'Auction calendar',
    subtitle: 'Calendar page copy and month navigation on /auction-calendar.',
    docKey: 'calendar',
    fields: CALENDAR_CMS_META.map((field) => field.key),
    meta: CALENDAR_CMS_META,
  },
  {
    id: 'categories',
    label: 'Categories',
    subtitle: 'Category directory search and empty states on /categories.',
    docKey: 'categories',
    fields: CATEGORIES_CMS_META.map((field) => field.key),
    meta: CATEGORIES_CMS_META,
  },
  {
    id: 'product',
    label: 'Product',
    subtitle: 'Tabs, gallery, errors, and checkout chrome on listing detail. Bid math stays in code.',
    docKey: 'product',
    fields: PRODUCT_CMS_META.map((field) => field.key),
    meta: PRODUCT_CMS_META,
  },
  {
    id: 'help',
    label: 'Help',
    subtitle: 'Help centre topics, FAQs, and safety tips.',
    docKey: 'help',
    fields: HELP_CMS_META.map((field) => field.key),
    meta: HELP_CMS_META,
  },
  {
    id: 'about',
    label: 'About',
    subtitle: 'Hardcoded copy on /about.',
    docKey: 'about',
    fields: ABOUT_CMS_META.map((field) => field.key),
    meta: ABOUT_CMS_META,
  },
  {
    id: 'legal',
    label: 'Legal',
    subtitle: 'Terms and privacy page copy. Phone numbers and emails stay in code.',
    docKey: 'legal',
    fields: LEGAL_CMS_META.map((field) => field.key),
    meta: LEGAL_CMS_META,
  },
  {
    id: 'contact',
    label: 'Contact',
    subtitle: 'Form labels and channel names. Address and phone stay in code.',
    docKey: 'contact',
    fields: CONTACT_CMS_META.map((field) => field.key),
    meta: CONTACT_CMS_META,
  },
  {
    id: 'account',
    label: 'Account',
    subtitle: 'Profile, purchases, and bids on /account. Authenticator copy is under Account authenticator.',
    docKey: 'account',
    fields: ACCOUNT_CMS_META.map((field) => field.key),
    meta: ACCOUNT_CMS_META,
  },
];

export default function AdminSiteContentPage() {
  const [navId, setNavId] = useState(LABEL_NAV[0].id);
  const current = LABEL_NAV.find((item) => item.id === navId) ?? LABEL_NAV[0];

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title="Site labels"
        subtitle="Pick a section. English and Arabic labels only — links, phones, and API errors stay in code. Empty field = built-in default."
      />
      <div style={css('display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap')}>
        <nav
          aria-label="Site label sections"
          style={css('flex: 0 0 220px; width: 220px; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 2px')}
        >
          {LABEL_NAV.map((item) => {
            const active = item.id === current.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setNavId(item.id)}
                style={css(
                  `text-align: start; border: 0; background: ${active ? '#F3F1EC' : 'transparent'}; color: #15191E; padding: 10px 14px; border-radius: 10px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer`,
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={css('flex: 1 1 480px; min-width: 0')}>
          <ChromeSection
            key={current.id}
            docKey={current.docKey}
            title={current.label}
            subtitle={current.subtitle}
            fields={current.fields}
            meta={current.meta}
          />
        </div>
      </div>
    </div>
  );
}
