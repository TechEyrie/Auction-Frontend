import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from './api.ts';

test('same-origin env is empty base, never a hostname', () => {
  assert.equal(resolveApiBaseUrl('same-origin', 'production'), '');
  assert.equal(resolveApiBaseUrl('', 'production'), '');
  assert.equal(resolveApiBaseUrl(' / ', 'production'), '');
  assert.equal(resolveApiBaseUrl(undefined, 'production'), '');
  assert.equal(resolveApiBaseUrl(undefined, 'development'), 'http://localhost:4000');
  assert.equal(resolveApiBaseUrl('https://auction-backend-7zcn.onrender.com/', 'production'), 'https://auction-backend-7zcn.onrender.com');
});
