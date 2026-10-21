'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import {
  type AuctionCalendarResponse,
  buildMondayFirstGrid,
  calendarQuery,
  formatAuctionCalendarEndTime,
  hrefForGroup,
  parseCalendarYearMonth,
  shiftMonth,
  yearMonthFromDateKey,
} from '../../lib/auctionCalendar';
import { css, PAGE_ROOT } from '../../lib/css';
import { qatarDateKey } from '../../lib/prayerTimes';
import { useAsync } from '../../lib/useAsync';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import '../main.css';
import './auction-calendar.css';

type WeekdayLabel = { full: string; narrow: string };

/** Monday-first weekday headers (2024-01-01 UTC is a Monday). */
function weekdayLabels(lang: string): WeekdayLabel[] {
  const locale = lang === 'ar' ? 'ar-QA' : 'en-GB';
  const fullFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const narrowFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
  return [1, 2, 3, 4, 5, 6, 7].map((day) => {
    const d = new Date(Date.UTC(2024, 0, day));
    return { full: fullFmt.format(d), narrow: narrowFmt.format(d) };
  });
}

function monthLabel(year: number, month: number, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-QA' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function AuctionCalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useUiLocale();
  const todayKey = qatarDateKey();
  const todayParts = yearMonthFromDateKey(todayKey);

  const fallback = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Qatar',
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(new Date());
    return {
      year: Number(parts.find((p) => p.type === 'year')?.value),
      month: Number(parts.find((p) => p.type === 'month')?.value),
    };
  }, []);

  const { year, month } = parseCalendarYearMonth(new URLSearchParams(searchParams.toString()), fallback);
  const grid = buildMondayFirstGrid(year, month);
  const weekdays = useMemo(() => weekdayLabels(lang), [lang]);

  const calendar = useAsync<AuctionCalendarResponse>(
    () => apiFetch<AuctionCalendarResponse>(`/api/auction-calendar?${calendarQuery(year, month, lang)}`),
    [year, month, lang],
  );

  const dayMap = useMemo(() => {
    const map = new Map<string, AuctionCalendarResponse['days'][number]['groups']>();
    for (const day of calendar.data?.days ?? []) {
      map.set(day.date, day.groups);
    }
    return map;
  }, [calendar.data]);

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    const qs = calendarQuery(next.year, next.month, lang);
    router.replace(`/auction-calendar?${qs}`);
  }

  function jumpToToday() {
    const qs = calendarQuery(todayParts.year, todayParts.month, lang);
    router.replace(`/auction-calendar?${qs}`);
  }

  return (
    <>
      <section className="ac-hero">
        <div className="ac-hero-inner">
          <nav className="ac-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">{t('common.home')}</Link> <span aria-hidden="true">/</span>{' '}
            {t('auctionCalendar.breadcrumb')}
          </nav>
          <h1>{t('auctionCalendar.h1')}</h1>
          <p className="ac-lead">{t('auctionCalendar.lead')}</p>
          <p className="ac-tz-note">{t('auctionCalendar.tzNote')}</p>
        </div>
      </section>

      <section className="ac-main">
        <div className="ac-toolbar">
          <h2 className="ac-month-title">{monthLabel(year, month, lang)}</h2>
          <div className="ac-toolbar-actions">
            <button type="button" className="ac-jump-today" onClick={jumpToToday}>
              {t('auctionCalendar.jumpToday')}
            </button>
            <button
              type="button"
              className="ac-nav-btn"
              aria-label={t('auctionCalendar.prev')}
              onClick={() => goMonth(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="ac-nav-btn ac-nav-btn--next"
              aria-label={t('auctionCalendar.next')}
              onClick={() => goMonth(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>

        {calendar.loading && (
          <p role="status" className="mkt-state" data-state="loading">{t('auctionCalendar.loading')}</p>
        )}

        {calendar.error && (
          <div role="alert" className="mkt-state" data-state="error">
            <p style={css('margin: 0 0 10px; font-weight: 600')}>{t('auctionCalendar.error')}</p>
            <button type="button" onClick={() => calendar.reload()} className="ac-retry">
              {t('auctionCalendar.retry')}
            </button>
          </div>
        )}

        {!calendar.loading && !calendar.error && (
          <div className="ac-grid-card" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="ac-weekdays">
              {weekdays.map((label, index) => (
                <div key={index} className="ac-weekday">
                  <span className="ac-weekday-full">{label.full}</span>
                  <span className="ac-weekday-narrow">{label.narrow}</span>
                </div>
              ))}
            </div>
            <div className="ac-grid">
              {grid.map((cell) => {
                const groups = dayMap.get(cell.date) ?? [];
                const isToday = cell.date === todayKey && cell.inMonth;
                const dayNum = Number(cell.date.slice(8, 10));
                return (
                  <div
                    key={cell.date}
                    className={`ac-cell${cell.inMonth ? '' : ' ac-cell--oom'}${isToday ? ' ac-cell--today' : ''}`}
                  >
                    <div className="ac-cell-head">
                      <span className="ac-day-num">{dayNum}</span>
                      {isToday && <span className="ac-today-pill">{t('auctionCalendar.today')}</span>}
                    </div>
                    <ul className="ac-events">
                      {groups.map((group) => (
                        <li key={group.parentCategoryKey}>
                          <Link href={hrefForGroup(group.parentCategoryKey, cell.date)} className="ac-chip">
                            <span className="ac-chip-photo" aria-hidden="true">
                              <img
                                src={group.imageUrl || '/calendar-parents/fallback.jpg'}
                                alt={group.parentCategoryName}
                                loading="lazy"
                                onError={(event) => {
                                  const img = event.currentTarget;
                                  if (!img.src.endsWith('/calendar-parents/fallback.jpg')) {
                                    img.src = '/calendar-parents/fallback.jpg';
                                  }
                                }}
                              />
                            </span>
                            {group.live && isToday ? (
                              <span className="ac-chip-live">{t('auctionCalendar.live')}</span>
                            ) : null}
                            <span
                              className="ac-chip-count"
                              aria-label={t('auctionCalendar.items', { n: group.listingCount })}
                            >
                              <svg
                                className="ac-chip-count-icon"
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  d="M6.5 2.5 4 5v2h16V5l-2.5-2.5H6.5ZM4 9v10h16V9H4Zm3 2h2v6H7v-6Zm4 0h2v6h-2v-6Zm4 0h2v6h-2v-6Z"
                                />
                              </svg>
                              {group.listingCount}
                            </span>
                            <span className="ac-chip-overlay">
                              <span className="ac-chip-time">
                                {formatAuctionCalendarEndTime(group.endsAt, lang)}
                              </span>
                              <span className="ac-chip-name">{group.parentCategoryName}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default function AuctionCalendarPage() {
  const { t } = useUiLocale();
  return (
    <div className="ac-page" style={css(PAGE_ROOT)}>
      <title>{t('auctionCalendar.title')}</title>
      <SiteHeader active="auctions" />
      <Suspense fallback={<p className="mkt-state">{t('auctionCalendar.loading')}</p>}>
        <AuctionCalendarContent />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
