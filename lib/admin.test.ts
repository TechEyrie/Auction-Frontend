import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_FIELD_ROW,
  fieldError,
  fieldsToPayload,
  formatBytes,
  moveItem,
  optionsFromText,
  optionsToText,
  pageWindow,
  payloadToRows,
} from './admin.ts';

test('field errors surface per field and per nested field', () => {
  assert.equal(fieldError({ displayName: 'required' }, 'displayName'), 'required');
  assert.equal(fieldError({ 'fields.make': 'duplicate key' }, 'make'), 'duplicate key');
  assert.equal(fieldError({ other: 'x' }, 'make'), null);
  assert.equal(fieldError(undefined, 'make'), null);
});

test('sizes are rendered for operators, and nonsense is not dressed up', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(200_000), '195 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
  assert.equal(formatBytes(-1), '—');
});

test('the pager window always offers the first and last page', () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(5, 20), [1, 4, 5, 6, 20]);
  assert.deepEqual(pageWindow(20, 20), [1, 19, 20]);
  assert.deepEqual(pageWindow(1, 0), []);
});

test('option text parses one `key: Label` per line and defaults the label', () => {
  const options = optionsFromText('new: Brand new\n\nused\nAutomatic : Tiptronic\n');
  assert.deepEqual(options, [
    { key: 'new', labelEn: 'Brand new' },
    { key: 'used', labelEn: 'used' },
    { key: 'automatic', labelEn: 'Tiptronic' },
  ]);
  assert.equal(optionsToText(options), 'new: Brand new\nused: used\nautomatic: Tiptronic');
});

test('editor rows become the exact payload the validator accepts', () => {
  const payload = fieldsToPayload([
    { ...EMPTY_FIELD_ROW, key: 'Model Name', type: 'text', labelEn: 'Model', required: true, minLength: '2', maxLength: '40', min: '5' },
    { ...EMPTY_FIELD_ROW, key: 'condition', type: 'select', labelEn: 'Condition', optionsText: 'new: New\nused: Used' },
    { ...EMPTY_FIELD_ROW, key: 'mileage', type: 'number', labelEn: 'Mileage', unit: 'km', min: '0', max: '9', dependsOnField: 'condition', dependsOnEquals: 'used' },
    { ...EMPTY_FIELD_ROW, key: 'notes', type: 'boolean', labelEn: 'Notes', dependsOnField: 'condition', dependsOnIn: 'new, used' },
  ]);

  assert.equal(payload[0]!.key, 'model_name', 'keys are normalized to snake_case');
  assert.equal(payload[0]!.order, 0);
  assert.deepEqual(payload[0]!.constraints, { minLength: 2, maxLength: 40 });
  assert.deepEqual(payload[1]!.options, [
    { key: 'new', labelEn: 'New' },
    { key: 'used', labelEn: 'Used' },
  ]);
  assert.deepEqual(payload[1]!.constraints, {}, 'select fields carry no numeric constraints');
  assert.deepEqual(payload[2]!.constraints, { min: 0, max: 9 });
  assert.deepEqual(payload[2]!.dependsOn, { field: 'condition', equals: 'used' });
  assert.deepEqual(payload[3]!.dependsOn, { field: 'condition', in: ['new', 'used'] });
  assert.equal(payload[2]!.order, 2, 'order follows the row order');
});

test('a stored field round-trips through the editor rows', () => {
  const payload = fieldsToPayload([
    { ...EMPTY_FIELD_ROW, key: 'model_name', type: 'text', labelEn: 'Model', minLength: '2', required: true },
    { ...EMPTY_FIELD_ROW, key: 'condition', type: 'select', labelEn: 'Condition', optionsText: 'new: New' },
    { ...EMPTY_FIELD_ROW, key: 'mileage', type: 'number', labelEn: 'Mileage', unit: 'km', min: '0', dependsOnField: 'condition', dependsOnEquals: 'used' },
  ]);
  const rows = payloadToRows(payload);

  assert.equal(rows.length, 3);
  assert.equal(rows[0]!.key, 'model_name');
  assert.equal(rows[0]!.minLength, '2');
  assert.equal(rows[1]!.optionsText, 'new: New');
  assert.equal(rows[2]!.unit, 'km');
  assert.equal(rows[2]!.min, '0');
  assert.equal(rows[2]!.dependsOnField, 'condition');
  assert.equal(rows[2]!.dependsOnEquals, 'used');
  assert.deepEqual(fieldsToPayload(rows), payload, 'a round-trip must not change the schema');
});

test('moving an asset never mutates the original order', () => {
  const order = ['a', 'b', 'c'];
  assert.deepEqual(moveItem(order, 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(order, 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(order, 1, 1), order);
  assert.deepEqual(moveItem(order, 5, 0), order);
  assert.deepEqual(order, ['a', 'b', 'c']);
});
