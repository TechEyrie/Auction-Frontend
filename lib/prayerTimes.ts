export const QATAR_TIMEZONE = 'Asia/Qatar';

export const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export type NextPrayerResult = { name: string; time: string } | null;

export function parseHm(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatHm(value: string): string {
  const [hRaw, mRaw] = value.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function prayerTimeRaw(timings: Record<string, string>, name: string): string | null {
  const raw = timings[name];
  if (!raw) return null;
  return raw.split(' ')[0] ?? raw;
}

/** Minutes since midnight in the given IANA timezone (24h clock). */
export function minutesOfDayInTimezone(now: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = Number(part.value);
    if (part.type === 'minute') minute = Number(part.value);
  }
  return hour * 60 + minute;
}

export function qatarMinutesOfDay(now: Date = new Date()): number {
  return minutesOfDayInTimezone(now, QATAR_TIMEZONE);
}

export function getQatarYmd(now: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const part of parts) {
    if (part.type === 'year') year = Number(part.value);
    if (part.type === 'month') month = Number(part.value);
    if (part.type === 'day') day = Number(part.value);
  }
  return { year, month, day };
}

/** Calendar date in Asia/Qatar as YYYY-MM-DD (for cache keys). */
export function qatarDateKey(now: Date = new Date()): string {
  const { year, month, day } = getQatarYmd(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Next calendar day in Asia/Qatar, formatted DD-MM-YYYY for Aladhan. */
export function aladhanTomorrowDateParam(now: Date = new Date()): string {
  const { year, month, day } = getQatarYmd(now);
  const noonQatar = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+03:00`,
  );
  noonQatar.setUTCDate(noonQatar.getUTCDate() + 1);
  const next = getQatarYmd(noonQatar);
  return `${String(next.day).padStart(2, '0')}-${String(next.month).padStart(2, '0')}-${next.year}`;
}

export function aladhanTimingsByCityUrl(
  city: string,
  country: string,
  method: number,
  dateDdMmYyyy?: string,
): string {
  const base = dateDdMmYyyy
    ? `https://api.aladhan.com/v1/timingsByCity/${dateDdMmYyyy}`
    : 'https://api.aladhan.com/v1/timingsByCity';
  const params = new URLSearchParams({
    city,
    country,
    method: String(method),
  });
  return `${base}?${params.toString()}`;
}

/**
 * Next prayer strictly after current Doha time. After Isha, uses tomorrow's Fajr when
 * `tomorrowTimings` is provided.
 */
export function nextPrayer(
  timings: Record<string, string>,
  options?: {
    now?: Date;
    /** Override for tests — never use browser local getHours for selection. */
    qatarMinutes?: number;
    tomorrowTimings?: Record<string, string> | null;
  },
): NextPrayerResult {
  const minutesNow = options?.qatarMinutes ?? qatarMinutesOfDay(options?.now ?? new Date());

  for (const name of PRAYER_ORDER) {
    const time = prayerTimeRaw(timings, name);
    if (!time) continue;
    if (parseHm(time) > minutesNow) return { name, time: formatHm(time) };
  }

  const tomorrowFajr = options?.tomorrowTimings
    ? prayerTimeRaw(options.tomorrowTimings, 'Fajr')
    : prayerTimeRaw(timings, 'Fajr');
  if (!tomorrowFajr) return null;
  return { name: 'Fajr', time: formatHm(tomorrowFajr) };
}
