import test from 'node:test';
import assert from 'node:assert/strict';
import {
  businessDatetimeLocalToUtcIso,
  clock,
  fmt,
  fmtBusinessDateTime,
  fmtMinor,
  qarToMinor,
  toBusinessDatetimeLocalValue,
} from './format.ts';

test('fmt', () => {
  assert.equal(fmt(182000), '182,000 QR');
  assert.equal(fmt(150), '150 QR');
});

test('fmtMinor', () => {
  assert.equal(fmtMinor(10000), '100.00 QR');
  assert.equal(fmtMinor(150), '1.50 QR');
});

test('fmtBusinessDateTime uses Qatar zone', () => {
  // 12:00 UTC = 15:00 in Asia/Qatar (UTC+3)
  const label = fmtBusinessDateTime('2026-06-15T12:00:00.000Z');
  assert.match(label, /Jun/);
  assert.match(label, /3:00/);
});

test('toBusinessDatetimeLocalValue and businessDatetimeLocalToUtcIso round-trip in Qatar', () => {
  const local = toBusinessDatetimeLocalValue(new Date('2026-06-15T12:00:00.000Z'));
  assert.equal(local, '2026-06-15T15:00');
  assert.equal(businessDatetimeLocalToUtcIso('2026-06-15T15:00'), '2026-06-15T12:00:00.000Z');
  assert.equal(businessDatetimeLocalToUtcIso('2026-06-15T15:00:00'), '2026-06-15T12:00:00.000Z');
});

test('qarToMinor', () => {
  assert.equal(qarToMinor(100), 10000);
  assert.equal(qarToMinor(1.5), 150);
});
test('clock', () => {
  assert.equal(clock(0), 'Ended');
  assert.equal(clock(-5), 'Ended');
  assert.equal(clock(59), '0h 00m 59s');
  assert.equal(clock(3600), '1h 00m 00s');
  assert.equal(clock(8040), '2h 14m 00s');
  assert.equal(clock(266000), '3d 1h 53m');
});
