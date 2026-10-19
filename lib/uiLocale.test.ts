import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDocumentLocale, isAdminPath, localizedText, uiDir } from './uiLocale.ts';
import { conditionLabel, MESSAGES, methodLabel, translate } from './uiMessages.ts';
import { listingCardTitle } from './listings.ts';

test('localizedText prefers the requested language and falls back', () => {
  const both = { en: 'Land Cruiser', ar: 'لاند كروزر' };
  assert.equal(localizedText(both, 'en'), 'Land Cruiser');
  assert.equal(localizedText(both, 'ar'), 'لاند كروزر');
  assert.equal(localizedText({ en: 'Only EN', ar: null }, 'ar'), 'Only EN');
  assert.equal(localizedText({ en: null, ar: 'عربي فقط' }, 'en'), 'عربي فقط');
  assert.equal(localizedText({ en: '  ', ar: 'عربي' }, 'en'), 'عربي');
  assert.equal(localizedText({ en: null, ar: null }, 'ar', 'fallback'), 'fallback');
  assert.equal(localizedText(null, 'en'), '');
});

test('listingCardTitle uses the Arabic title only when lang is ar and present', () => {
  const listing = { title: { en: 'Land Cruiser', ar: 'لاند كروزر' }, listingReference: 'l_abcdef12' };
  assert.equal(listingCardTitle(listing), 'LAND CRUISER');
  assert.equal(listingCardTitle(listing, 'en'), 'LAND CRUISER');
  assert.equal(listingCardTitle(listing, 'ar'), 'لاند كروزر');
  assert.equal(listingCardTitle({ title: { en: 'Watch', ar: null } }, 'ar'), 'WATCH');
  assert.equal(listingCardTitle({ title: { en: null, ar: null }, listingReference: 'l_abcdef12' }), 'L_ABCDEF12');
});

test('uiDir and isAdminPath', () => {
  assert.equal(uiDir('ar'), 'rtl');
  assert.equal(uiDir('en'), 'ltr');
  assert.equal(isAdminPath('/admin'), true);
  assert.equal(isAdminPath('/admin/listings'), true);
  assert.equal(isAdminPath('/administrator'), false);
  assert.equal(isAdminPath('/browse'), false);
});

test('applyDocumentLocale is a no-op without a DOM', () => {
  assert.doesNotThrow(() => applyDocumentLocale('ar', '/browse'));
});

test('header, footer and chrome messages exist in both languages', () => {
  assert.equal(translate('en', 'nav.auction'), 'Auction');
  assert.equal(translate('ar', 'nav.auction'), 'المزاد');
  assert.equal(translate('ar', 'header.signOut'), 'تسجيل الخروج');
  assert.equal(translate('en', 'common.bidNow'), 'Bid Now');
  assert.equal(translate('ar', 'info.nextPrayer'), 'الصلاة القادمة');
  assert.equal(translate('en', 'common.daysAgo', { n: 3 }), '3 days ago');
  assert.deepEqual(Object.keys(MESSAGES.ar).sort(), Object.keys(MESSAGES.en).sort());
  for (const [key, value] of Object.entries(MESSAGES.ar)) {
    assert.ok(value.length > 0, `empty Arabic message for ${key}`);
  }
});

test('methodLabel and conditionLabel localise known values and fall back for unknown', () => {
  assert.equal(methodLabel('ar', 'auction'), 'مزاد');
  assert.equal(methodLabel('en', 'fixed_price'), 'Fixed price');
  assert.equal(methodLabel('ar', 'mystery'), 'mystery');
  assert.equal(conditionLabel('ar', 'like_new'), 'كالجديد');
  assert.equal(conditionLabel('en', 'not_applicable'), 'not applicable');
});
