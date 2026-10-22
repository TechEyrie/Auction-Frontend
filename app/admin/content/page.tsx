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
import { cmsFieldAdminHint, cmsFieldAdminLabel, cmsGroupLabel } from '../../../lib/cmsAdminChrome';
import { useUiLocale } from '../../../lib/UiLocaleProvider';
import type { MessageKey } from '../../../lib/uiMessages';
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
  const { t, lang } = useUiLocale();

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
      setSaved(t('admin.content.savedPublished'));
      void load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t('admin.content.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={title}
      actions={
        version !== null ? (
          <span className="adm-hint">{t('admin.content.publishedVersion', { version })}</span>
        ) : (
          <span className="adm-hint">{t('admin.content.notPublished')}</span>
        )
      }
    >
      <p className="adm-hint" style={css('margin: 0 0 16px')}>{subtitle}</p>
      <StateBlock loading={loading} error={loadError} onRetry={() => void load()}>
        <form onSubmit={onSave} style={css('display: flex; flex-direction: column; gap: 20px')}>
          {meta.map((field, index) => (
            <Fragment key={field.key}>
            {field.group && (index === 0 || meta[index - 1]?.group !== field.group) ? (
              <h3 className="adm-cms-group">{cmsGroupLabel(field.group, lang)}</h3>
            ) : null}
            <div className="adm-fieldrow">
              <div>
                <div className="adm-cms-field-title">{cmsFieldAdminLabel(field, lang)}</div>
                {field.hint ? <div className="adm-hint">{cmsFieldAdminHint(field, lang)}</div> : null}
              </div>
              <div className="adm-grid">
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
                    <label key={locale} className="adm-cms-locale">
                      <span>{locale === 'en' ? t('admin.field.localeEn') : t('admin.field.localeAr')}</span>
                      {longCopy ? <textarea {...shared} rows={4} /> : <input {...shared} />}
                      <span className="adm-hint">{t('admin.content.leaveEmpty', { fallback })}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            </Fragment>
          ))}
          {saveError ? <p role="alert" className="adm-field-error" style={css('margin: 0')}>{saveError}</p> : null}
          {saved ? <p role="status" className="adm-note" data-tone="good">{saved}</p> : null}
          <button type="submit" disabled={busy} className="btn-primary adm-cms-save">
            {busy ? t('admin.common.saving') : t('admin.content.saveSection', { section: title })}
          </button>
        </form>
      </StateBlock>
    </Panel>
  );
}

type LabelNavItem = {
  id: string;
  labelKey: MessageKey;
  subtitleKey: MessageKey;
  docKey: ChromeDocKey;
  fields: readonly string[];
  meta: ChromeFieldMeta[];
};

const LABEL_NAV: LabelNavItem[] = [
  {
    id: 'header',
    labelKey: 'admin.cms.header',
    subtitleKey: 'admin.cms.headerSub',
    docKey: 'header',
    fields: HEADER_CMS_META.map((field) => field.key),
    meta: HEADER_CMS_META,
  },
  {
    id: 'footer',
    labelKey: 'admin.cms.footer',
    subtitleKey: 'admin.cms.footerSub',
    docKey: 'footer',
    fields: FOOTER_CMS_META.map((field) => field.key),
    meta: FOOTER_CMS_META,
  },
  {
    id: 'signin',
    labelKey: 'admin.cms.signin',
    subtitleKey: 'admin.cms.signinSub',
    docKey: 'auth',
    fields: SIGN_IN_CMS_META.map((field) => field.key),
    meta: SIGN_IN_CMS_META,
  },
  {
    id: 'register',
    labelKey: 'admin.cms.register',
    subtitleKey: 'admin.cms.registerSub',
    docKey: 'auth',
    fields: CREATE_ACCOUNT_CMS_META.map((field) => field.key),
    meta: CREATE_ACCOUNT_CMS_META,
  },
  {
    id: 'forgot',
    labelKey: 'admin.cms.forgot',
    subtitleKey: 'admin.cms.forgotSub',
    docKey: 'auth',
    fields: FORGOT_CMS_META.map((field) => field.key),
    meta: FORGOT_CMS_META,
  },
  {
    id: 'reset',
    labelKey: 'admin.cms.reset',
    subtitleKey: 'admin.cms.resetSub',
    docKey: 'auth',
    fields: RESET_CMS_META.map((field) => field.key),
    meta: RESET_CMS_META,
  },
  {
    id: 'account-mfa',
    labelKey: 'admin.cms.accountMfa',
    subtitleKey: 'admin.cms.accountMfaSub',
    docKey: 'auth',
    fields: ACCOUNT_MFA_CMS_META.map((field) => field.key),
    meta: ACCOUNT_MFA_CMS_META,
  },
  {
    id: 'home',
    labelKey: 'admin.cms.home',
    subtitleKey: 'admin.cms.homeSub',
    docKey: 'home',
    fields: HOME_CMS_META.map((field) => field.key),
    meta: HOME_CMS_META,
  },
  {
    id: 'browse',
    labelKey: 'admin.cms.browse',
    subtitleKey: 'admin.cms.browseSub',
    docKey: 'browse',
    fields: BROWSE_CMS_META.map((field) => field.key),
    meta: BROWSE_CMS_META,
  },
  {
    id: 'auctions',
    labelKey: 'admin.cms.auctions',
    subtitleKey: 'admin.cms.auctionsSub',
    docKey: 'auctions',
    fields: AUCTIONS_CMS_META.map((field) => field.key),
    meta: AUCTIONS_CMS_META,
  },
  {
    id: 'calendar',
    labelKey: 'admin.cms.calendar',
    subtitleKey: 'admin.cms.calendarSub',
    docKey: 'calendar',
    fields: CALENDAR_CMS_META.map((field) => field.key),
    meta: CALENDAR_CMS_META,
  },
  {
    id: 'categories',
    labelKey: 'admin.cms.categories',
    subtitleKey: 'admin.cms.categoriesSub',
    docKey: 'categories',
    fields: CATEGORIES_CMS_META.map((field) => field.key),
    meta: CATEGORIES_CMS_META,
  },
  {
    id: 'product',
    labelKey: 'admin.cms.product',
    subtitleKey: 'admin.cms.productSub',
    docKey: 'product',
    fields: PRODUCT_CMS_META.map((field) => field.key),
    meta: PRODUCT_CMS_META,
  },
  {
    id: 'help',
    labelKey: 'admin.cms.help',
    subtitleKey: 'admin.cms.helpSub',
    docKey: 'help',
    fields: HELP_CMS_META.map((field) => field.key),
    meta: HELP_CMS_META,
  },
  {
    id: 'about',
    labelKey: 'admin.cms.about',
    subtitleKey: 'admin.cms.aboutSub',
    docKey: 'about',
    fields: ABOUT_CMS_META.map((field) => field.key),
    meta: ABOUT_CMS_META,
  },
  {
    id: 'legal',
    labelKey: 'admin.cms.legal',
    subtitleKey: 'admin.cms.legalSub',
    docKey: 'legal',
    fields: LEGAL_CMS_META.map((field) => field.key),
    meta: LEGAL_CMS_META,
  },
  {
    id: 'contact',
    labelKey: 'admin.cms.contact',
    subtitleKey: 'admin.cms.contactSub',
    docKey: 'contact',
    fields: CONTACT_CMS_META.map((field) => field.key),
    meta: CONTACT_CMS_META,
  },
  {
    id: 'account',
    labelKey: 'admin.cms.account',
    subtitleKey: 'admin.cms.accountSub',
    docKey: 'account',
    fields: ACCOUNT_CMS_META.map((field) => field.key),
    meta: ACCOUNT_CMS_META,
  },
];

export default function AdminSiteContentPage() {
  const { t, lang } = useUiLocale();
  const [navId, setNavId] = useState(LABEL_NAV[0].id);
  const current = LABEL_NAV.find((item) => item.id === navId) ?? LABEL_NAV[0];

  return (
    <div style={css('display: flex; flex-direction: column; gap: 16px')}>
      <PageHeader
        title={t('admin.content.title')}
        subtitle={t('admin.content.subtitle')}
      />
      <div style={css('display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap')}>
        <nav aria-label={t('admin.content.navAria')} className="adm-cms-nav">
          {LABEL_NAV.map((item) => {
            const active = item.id === current.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setNavId(item.id)}
              >
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>
        <div style={css('flex: 1 1 480px; min-width: 0')}>
          <ChromeSection
            key={current.id}
            docKey={current.docKey}
            title={t(current.labelKey)}
            subtitle={t(current.subtitleKey)}
            fields={current.fields}
            meta={current.meta}
          />
        </div>
      </div>
    </div>
  );
}
