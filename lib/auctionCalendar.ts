export const PARENT_CATEGORY_IMAGES = new Set<string>();

export function parentCategoryImageSrc(parentCategoryKey: string): string {
  const key = parentCategoryKey.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (PARENT_CATEGORY_IMAGES.has(key)) return `/calendar-parents/${key}.jpg`;
  return '/calendar-parents/fallback.jpg';
}

export type AuctionCalendarGroup = {
  parentCategoryKey: string;
  parentCategoryName: string;
  listingCount: number;
  endsAt: string;
  live: boolean;
};

export type AuctionCalendarDay = {
  date: string;
  groups: AuctionCalendarGroup[];
};

export type AuctionCalendarResponse = {
  month: { year: number; month: number };
  timezone: string;
  days: AuctionCalendarDay[];
};

export type GridCell = { date: string; inMonth: boolean };

export function parseCalendarYearMonth(
  params: URLSearchParams,
  fallback: { year: number; month: number },
): { year: number; month: number } {
  const yearRaw = params.get('year');
  const monthRaw = params.get('month');
  const year = yearRaw ? Number(yearRaw) : fallback.year;
  const month = monthRaw ? Number(monthRaw) : fallback.month;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  if (!Number.isInteger(month) || month < 1 || month > 12) return fallback;
  return { year, month };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function civilDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday-first grid for a civil month; adjacent-month padding cells have `inMonth: false`. */
export function buildMondayFirstGrid(year: number, month: number): GridCell[] {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const length = daysInMonth(year, month);
  const cells: GridCell[] = [];

  const prev = shiftMonth(year, month, -1);
  const prevLength = daysInMonth(prev.year, prev.month);
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevLength - i;
    cells.push({ date: civilDate(prev.year, prev.month, day), inMonth: false });
  }

  for (let day = 1; day <= length; day += 1) {
    cells.push({ date: civilDate(year, month, day), inMonth: true });
  }

  const next = shiftMonth(year, month, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: civilDate(next.year, next.month, nextDay), inMonth: false });
    nextDay += 1;
  }
  return cells;
}

export function hrefForGroup(parentCategoryKey: string): string {
  const params = new URLSearchParams({ method: 'auction', category: parentCategoryKey });
  return `/browse?${params.toString()}`;
}

export function calendarQuery(year: number, month: number, locale: string): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    locale,
  });
  return params.toString();
}

/** `YYYY-MM-DD` (Qatar civil date) → year and month for calendar navigation. */
export function yearMonthFromDateKey(dateKey: string): { year: number; month: number } {
  return {
    year: Number(dateKey.slice(0, 4)),
    month: Number(dateKey.slice(5, 7)),
  };
}

/** End time only, in Asia/Qatar — no calendar date in the string. */
export function formatAuctionCalendarEndTime(endsAt: string, lang: string): string {
  const locale = lang === 'ar' ? 'ar-QA' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Qatar',
  }).format(new Date(endsAt));
}
