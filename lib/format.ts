import type { UiLang } from './uiLocale.ts';

export function fmt(n: number): string {
  return n.toLocaleString('en-US') + ' QR';
}

/** Money on the wire is integer minor units (100 = 1.00 QR). */
export function fmtMinor(minor: number, lang: UiLang = 'en'): string {
  const locale = lang === 'ar' ? 'ar-QA' : 'en-US';
  const suffix = lang === 'ar' ? ' ر.ق' : ' QR';
  return `${(minor / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

/** Convert a QAR amount typed in the UI to integer minor units for the API. */
export function qarToMinor(qar: number): number {
  return Math.round(qar * 100);
}

/** Business times display in Qatar (stored and transported as UTC). */
export const BUSINESS_TIMEZONE = 'Asia/Qatar';

/** Asia/Qatar has no DST; used when encoding datetime-local values as wall-clock Qatar time. */
const QATAR_UTC_OFFSET = '+03:00';

export function fmtBusinessDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Format an instant as `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">` in Qatar time. */
export function toBusinessDatetimeLocalValue(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/**
 * Parse a datetime-local string as Qatar wall-clock time and return a UTC ISO instant.
 * `new Date('YYYY-MM-DDTHH:mm')` would wrongly use the browser's timezone.
 */
export function businessDatetimeLocalToUtcIso(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/.exec(trimmed);
  if (!match) throw new Error('Invalid datetime');
  const base = match[1]!;
  const withSeconds = /T\d{2}:\d{2}:\d{2}$/.test(trimmed) ? trimmed : `${base}:00`;
  const date = new Date(`${withSeconds}${QATAR_UTC_OFFSET}`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid datetime');
  return date.toISOString();
}

export function relativeTimeLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtBusinessDateTime(iso);
}

export function clock(s: number): string {
  if (s <= 0) return 'Ended';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (x: number) => (x < 10 ? '0' : '') + x;
  if (d > 0) return d + 'd ' + h + 'h ' + p(m) + 'm ' + p(sec) + 's';
  return h + 'h ' + p(m) + 'm ' + p(sec) + 's';
}
