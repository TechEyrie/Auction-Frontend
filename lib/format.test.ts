import test from 'node:test';
import assert from 'node:assert/strict';
import { clock, fmt, fmtBusinessDateTime, fmtMinor, qarToMinor } from './format.ts';

test('fmt', () => {
  assert.equal(fmt(182000), '182,000 QAR');
  assert.equal(fmt(150), '150 QAR');
});

test('fmtMinor', () => {
  assert.equal(fmtMinor(10000), '100.00 QAR');
  assert.equal(fmtMinor(150), '1.50 QAR');
});

test('fmtBusinessDateTime uses Qatar zone', () => {
  const label = fmtBusinessDateTime('2026-06-15T12:00:00.000Z');
  assert.match(label, /Jun/);
  assert.match(label, /\d/);
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
