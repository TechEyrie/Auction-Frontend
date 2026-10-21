import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMondayFirstGrid,
  formatAuctionCalendarEndTime,
  hrefForGroup,
  parentCategoryImageSrc,
  parseCalendarYearMonth,
  shiftMonth,
  yearMonthFromDateKey,
} from './auctionCalendar.ts';

test('buildMondayFirstGrid pads October 2026 with Monday as first column', () => {
  const grid = buildMondayFirstGrid(2026, 10);
  assert.equal(grid.length % 7, 0);
  assert.equal(grid[0].date, '2026-09-28');
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid.find((cell) => cell.date === '2026-10-01')?.inMonth, true);
  assert.equal(grid.filter((cell) => cell.inMonth).length, 31);
});

test('shiftMonth rolls across year boundary', () => {
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});

test('parseCalendarYearMonth reads search params with fallback', () => {
  const fallback = { year: 2026, month: 5 };
  const params = new URLSearchParams('year=2027&month=3');
  assert.deepEqual(parseCalendarYearMonth(params, fallback), { year: 2027, month: 3 });
  assert.deepEqual(parseCalendarYearMonth(new URLSearchParams('month=13'), fallback), fallback);
});

test('hrefForGroup links to auction browse for parent category and civil day', () => {
  assert.equal(
    hrefForGroup('clothing', '2026-10-22'),
    '/browse?method=auction&category=clothing&endsOn=2026-10-22',
  );
});

test('parentCategoryImageSrc falls back without bundled parent images', () => {
  assert.equal(parentCategoryImageSrc('glasses'), '/calendar-parents/fallback.jpg');
  assert.equal(parentCategoryImageSrc('unknown-category'), '/calendar-parents/fallback.jpg');
});

test('yearMonthFromDateKey parses Qatar civil date keys', () => {
  assert.deepEqual(yearMonthFromDateKey('2026-10-19'), { year: 2026, month: 10 });
});

test('formatAuctionCalendarEndTime shows time only in Qatar', () => {
  const formatted = formatAuctionCalendarEndTime('2026-10-20T04:34:00.000Z', 'en');
  assert.match(formatted, /\d/);
  assert.doesNotMatch(formatted, /2026/);
  assert.doesNotMatch(formatted, /Oct/i);
});
