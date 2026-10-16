import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPrayer,
  parseHm,
  qatarMinutesOfDay,
} from './prayerTimes.ts';

const DOHA_DAY = {
  Fajr: '04:17',
  Dhuhr: '11:30',
  Asr: '14:45',
  Maghrib: '17:30',
  Isha: '19:00',
};

const DOHA_NEXT = {
  Fajr: '04:16',
  Dhuhr: '11:29',
  Asr: '14:44',
  Maghrib: '17:29',
  Isha: '18:59',
};

test('parseHm', () => {
  assert.equal(parseHm('04:17'), 4 * 60 + 17);
});

test('qatarMinutesOfDay uses Asia/Qatar not host local', () => {
  const instant = new Date('2026-10-16T21:42:00.000Z');
  assert.equal(qatarMinutesOfDay(instant), 42);
});

test('before Fajr → Fajr', () => {
  assert.deepEqual(nextPrayer(DOHA_DAY, { qatarMinutes: 3 * 60 }), {
    name: 'Fajr',
    time: '04:17',
  });
});

test('between Dhuhr and Asr → Asr', () => {
  assert.deepEqual(nextPrayer(DOHA_DAY, { qatarMinutes: 12 * 60 }), {
    name: 'Asr',
    time: '14:45',
  });
});

test('after Isha → tomorrow Fajr', () => {
  assert.deepEqual(
    nextPrayer(DOHA_DAY, { qatarMinutes: 20 * 60, tomorrowTimings: DOHA_NEXT }),
    { name: 'Fajr', time: '04:16' },
  );
});

test('selection must use Qatar minutes — same instant, different minute bases diverge', () => {
  const correct = nextPrayer(DOHA_DAY, { qatarMinutes: 42 });
  assert.deepEqual(correct, { name: 'Fajr', time: '04:17' });

  const asIfAfternoonLocal = nextPrayer(DOHA_DAY, { qatarMinutes: 17 * 60 });
  assert.equal(asIfAfternoonLocal?.name, 'Maghrib');
  assert.notEqual(asIfAfternoonLocal?.name, correct?.name);
});
