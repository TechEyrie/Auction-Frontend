import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo } from './returnTo.ts';

test('safeReturnTo keeps internal paths', () => {
  assert.equal(safeReturnTo('/admin'), '/admin');
  assert.equal(safeReturnTo('/admin?tab=users'), '/admin?tab=users');
  assert.equal(safeReturnTo('  /browse  '), '/browse');
});

test('safeReturnTo refuses absolute and protocol-relative URLs', () => {
  assert.equal(safeReturnTo('https://evil.example/steal'), '/');
  assert.equal(safeReturnTo('//evil.example'), '/');
  assert.equal(safeReturnTo('/\\evil.example'), '/');
  assert.equal(safeReturnTo('javascript:alert(1)'), '/');
  assert.equal(safeReturnTo('/javascript:alert(1)'), '/');
});

test('safeReturnTo falls back on empty, missing and unsafe input', () => {
  assert.equal(safeReturnTo(null), '/');
  assert.equal(safeReturnTo(undefined), '/');
  assert.equal(safeReturnTo(''), '/');
  assert.equal(safeReturnTo('admin'), '/');
  assert.equal(safeReturnTo('/a\nb'), '/');
  assert.equal(safeReturnTo(null, '/admin'), '/admin');
});
