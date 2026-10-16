export function fmt(n: number): string {
  return n.toLocaleString('en-US') + ' QAR';
}

/** Money on the wire is integer minor units (100 = 1.00 QAR). */
export function fmtMinor(minor: number): string {
  return `${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR`;
}

/** Convert a QAR amount typed in the UI to integer minor units for the API. */
export function qarToMinor(qar: number): number {
  return Math.round(qar * 100);
}

/** Business auction times display in Qatar (stored and transported as UTC). */
export const BUSINESS_TIMEZONE = 'Asia/Qatar';

export function fmtBusinessDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
  if (d > 0) return d + 'd ' + h + 'h ' + p(m) + 'm';
  return h + 'h ' + p(m) + 'm ' + p(sec) + 's';
}
