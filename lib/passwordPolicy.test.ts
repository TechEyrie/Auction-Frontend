import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePassword } from './passwordPolicy.ts';

test('create-account passwords must be 10+ characters and not common', () => {
  assert.equal(evaluatePassword('').acceptable, false);
  assert.equal(evaluatePassword('password123').acceptable, false);
  assert.equal(evaluatePassword('qwerty12345').acceptable, false);
  assert.equal(evaluatePassword('BuyerPass12').acceptable, true);
  assert.equal(evaluatePassword('correct horse 1').label === 'too-weak' || evaluatePassword('correct horse 1').acceptable, true);
  assert.equal(evaluatePassword('correct horse 1').acceptable, true);
});

test('name and email tokens cannot be the password', () => {
  const result = evaluatePassword('SaraHouse12', { fullName: 'Sara House', email: 'sara.house@example.com' });
  assert.equal(result.acceptable, false);
  assert.ok(result.issues.includes('personal'));
});
