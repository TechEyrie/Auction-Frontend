import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiRequestError } from './api.ts';
import {
  formatListingFieldError,
  firstListingErrorSection,
  listingApiErrorMessage,
  listingFieldInlineMessage,
  listingValidationFromApiError,
  missingRequiredAttributeLabels,
} from './listingFieldErrors.ts';

const schema = [{ key: 'item_condition', type: 'select' as const, labelEn: 'Condition', required: true, filterable: false, publicDisplay: true, adminOnly: false, order: 0, options: [] }];

test('required attribute errors name Condition and category details', () => {
  const formatted = formatListingFieldError('attributes.item_condition', 'required', { schemaFields: schema });
  assert.equal(formatted.inline, 'Required');
  assert.match(formatted.summary, /Category details/);
  assert.match(formatted.summary, /Condition/);
  assert.match(formatted.summary, /before publishing/);
});

test('banner copy for publish refusal is explicit', () => {
  const err = new ApiRequestError(400, {
    code: 'VALIDATION_ERROR',
    message: 'Some attributes are not valid for this category',
    fieldErrors: { 'attributes.item_condition': 'required' },
    requestId: 'r1',
    details: {},
  });
  const alert = listingValidationFromApiError(err, { schemaFields: schema }, { publishAttempt: true });
  assert.equal(alert?.headline, 'Cannot publish yet');
  assert.equal(alert?.items.length, 1);
  assert.match(alert!.items[0]!, /Condition/);
  assert.equal(
    listingApiErrorMessage(err, { schemaFields: schema }, { publishAttempt: true }),
    `Cannot publish yet: ${alert!.items[0]}`,
  );
});

test('inline field messages resolve schema labels', () => {
  assert.equal(
    listingFieldInlineMessage({ 'attributes.item_condition': 'required' }, 'attributes.item_condition', { schemaFields: schema }),
    'Required',
  );
});

test('first error section prefers basics before attributes', () => {
  assert.equal(firstListingErrorSection({ audience: 'required', 'attributes.brand': 'required' }), 'basics');
  assert.equal(firstListingErrorSection({ 'attributes.brand': 'required' }), 'attributes');
});

test('missing required checklist uses the same labels as schema', () => {
  const labels = missingRequiredAttributeLabels(schema, {});
  assert.deepEqual(labels, ['Condition']);
});
