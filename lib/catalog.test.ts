import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryByKey, categoryChildren, categoryRoots } from './catalog.ts';

const sample = [
  { key: 'vehicles', parentKey: null, name: 'Vehicles', order: 2 },
  { key: 'cars', parentKey: 'vehicles', name: 'Cars', order: 1 },
  { key: 'sedans', parentKey: 'cars', name: 'Sedans', order: 0 },
  { key: 'electronics', parentKey: null, name: 'Electronics', order: 1 },
  { key: 'phones', parentKey: 'electronics', name: 'Phones', order: 0 },
];

test('category tree helpers', () => {
  assert.deepEqual(categoryRoots(sample).map((c) => c.key), ['electronics', 'vehicles']);
  assert.deepEqual(categoryChildren(sample, 'vehicles').map((c) => c.key), ['cars']);
  assert.deepEqual(categoryChildren(sample, 'electronics').map((c) => c.key), ['phones']);
  assert.equal(categoryByKey(sample, 'sedans')?.name, 'Sedans');
  assert.equal(categoryByKey(sample, 'missing'), undefined);
  assert.deepEqual(categoryChildren(sample, 'missing'), []);
});
