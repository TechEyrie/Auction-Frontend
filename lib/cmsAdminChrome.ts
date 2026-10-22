import type { UiLang } from './uiLocale.ts';
import type { ChromeFieldMeta } from './siteChrome.ts';
import { CMS_EL_AR, CMS_GROUP_AR } from './cmsElMessages.ts';
import type { MessageKey } from './uiMessages.ts';

function cmsElKey(fieldKey: string): `admin.cms.el.${string}` {
  return `admin.cms.el.${fieldKey.replace(/\./g, '_')}` as `admin.cms.el.${string}`;
}

export function cmsGroupLabel(group: string, lang: UiLang): string {
  if (lang === 'ar') return CMS_GROUP_AR[group] ?? group;
  return group;
}

export function cmsFieldAdminLabel(field: ChromeFieldMeta, lang: UiLang): string {
  if (lang === 'en') return field.label;
  const key = cmsElKey(field.key) as MessageKey;
  return CMS_EL_AR[key as keyof typeof CMS_EL_AR] ?? field.label;
}

export function cmsFieldAdminHint(field: ChromeFieldMeta, lang: UiLang): string | undefined {
  if (!field.hint) return undefined;
  if (lang === 'en') return field.hint;
  return field.hintAr ?? field.hint;
}
