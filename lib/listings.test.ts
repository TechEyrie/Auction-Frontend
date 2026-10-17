import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attributePayload,
  browseQuery,
  coverAfterChange,
  coverImage,
  applyBrowseChange,
  beginSave,
  completeSave,
  conditionOptionsFor,
  mapListingConditionToItemCondition,
  withSyncedItemCondition,
  dependencySatisfied,
  initialSaveTrack,
  incompatibleAttributeKeys,
  localizedProblems,
  markDirty,
  mediaPayload,
  moveMedia,
  parseBrowseState,
  reconciliationSummary,
  requiredLocales,
  saveStatusText,
  shouldAdoptServerForm,
  visibleFields,
  isListingRouteKey,
  listingDetailApiPath,
  productPath,
  productSlugFromPublicUrl,
  type AttributeField,
} from './listings.ts';

function field(overrides: Partial<AttributeField> & { key: string }): AttributeField {
  return {
    type: 'text',
    labelEn: overrides.key,
    required: false,
    filterable: false,
    publicDisplay: true,
    adminOnly: false,
    order: 0,
    options: [],
    dependsOn: null,
    ...overrides,
  };
}

test('product links use listing reference; API accepts slug or reference', () => {
  const listing = { listingReference: 'l_Jtm2KExh-gGp', publicUrl: '/product/al-majlis-2' };
  assert.equal(productPath(listing), '/product/l_Jtm2KExh-gGp');
  assert.equal(productSlugFromPublicUrl(listing.publicUrl), 'al-majlis-2');
  assert.equal(listingDetailApiPath('al-majlis-2'), '/api/listings/al-majlis-2');
  assert.equal(listingDetailApiPath('l_Jtm2KExh-gGp'), '/api/listings/l_Jtm2KExh-gGp');
  assert.ok(isListingRouteKey('al-majlis-2'));
  assert.ok(isListingRouteKey('l_Jtm2KExh-gGp'));
  assert.equal(listingDetailApiPath('not valid!'), null);
});

test('an advertisement language decides which locales are required', () => {
  assert.deepEqual(requiredLocales('en'), ['en']);
  assert.deepEqual(requiredLocales('ar'), ['ar']);
  assert.deepEqual(requiredLocales('both'), ['en', 'ar']);

  // English-only content is complete for an English-only advertisement ...
  assert.deepEqual(
    localizedProblems({ title: { en: 'A car for sale', ar: null }, description: { en: 'A description long enough.', ar: null }, languageMode: 'en' }),
    [],
  );
  // ... and incomplete once the advertisement claims both languages.
  const problems = localizedProblems({
    title: { en: 'A car for sale', ar: null },
    description: { en: 'A description long enough.', ar: null },
    languageMode: 'both',
  });
  assert.equal(problems.length, 2);
  assert.ok(problems.some((problem) => problem.startsWith('Arabic title')));
  assert.ok(problems.some((problem) => problem.startsWith('Arabic description')));
});

test('conditions are offered only where they mean something', () => {
  assert.deepEqual(conditionOptionsFor('enquiry'), ['not_applicable']);
  assert.ok(conditionOptionsFor('auction').includes('used'));
  assert.ok(!conditionOptionsFor('fixed_price').includes('not_applicable'));
});

test('basics condition maps to item_condition when category schema defines it', () => {
  assert.equal(mapListingConditionToItemCondition('new'), 'new');
  assert.equal(mapListingConditionToItemCondition('like_new'), 'like-new');
  assert.equal(mapListingConditionToItemCondition('used'), 'used');
  assert.equal(mapListingConditionToItemCondition('refurbished'), 'used');
  assert.equal(mapListingConditionToItemCondition('not_applicable'), null);
  assert.equal(mapListingConditionToItemCondition(null), null);

  const itemConditionField = field({
    key: 'item_condition',
    type: 'select',
    required: true,
    options: [{ key: 'used', labelEn: 'Used' }],
  });
  const fields = [itemConditionField, field({ key: 'colour', type: 'text' })];

  assert.deepEqual(withSyncedItemCondition(fields, {}, 'refurbished'), { item_condition: 'used' });
  assert.deepEqual(withSyncedItemCondition(fields, { colour: 'red' }, 'new'), { colour: 'red', item_condition: 'new' });
  assert.deepEqual(withSyncedItemCondition(fields, { item_condition: 'like-new' }, 'used'), { item_condition: 'like-new' });
  assert.deepEqual(withSyncedItemCondition([field({ key: 'colour', type: 'text' })], {}, 'new'), {});
});

test('dependency gating decides what is shown, and only that', () => {
  const make = field({ key: 'make', type: 'select', options: [{ key: 'toyota', labelEn: 'Toyota' }], order: 0 });
  const doors = field({
    key: 'doors',
    type: 'number',
    order: 1,
    dependsOn: { field: 'make', equals: 'toyota' },
  });
  const extras = field({ key: 'extras', type: 'multiselect', order: 2, dependsOn: { field: 'make', in: ['toyota', 'nissan'] } });
  const fields = [doors, make, extras];

  assert.equal(dependencySatisfied(doors, {}), false);
  assert.equal(dependencySatisfied(doors, { make: 'toyota' }), true);
  assert.deepEqual(visibleFields(fields, { make: 'toyota' }).map((entry) => entry.key), ['make', 'doors', 'extras']);
  assert.deepEqual(visibleFields(fields, {}).map((entry) => entry.key), ['make']);
});

test('the attribute payload only carries keys the schema defines', () => {
  const fields = [
    field({ key: 'make', type: 'select', options: [{ key: 'toyota', labelEn: 'Toyota' }] }),
    field({ key: 'mileage', type: 'number' }),
    field({ key: 'sealed', type: 'boolean' }),
    field({ key: 'doors', type: 'number', dependsOn: { field: 'sealed', equals: true } }),
  ];

  const payload = attributePayload(fields, {
    make: 'toyota',
    mileage: '120000',
    sealed: false,
    doors: 5,
    legacy_field: 'must not be sent',
  });
  assert.deepEqual(payload, { make: 'toyota', mileage: 120000, sealed: false });
  assert.deepEqual(attributePayload(fields, { mileage: 'not a number', sealed: true, doors: '4' }), { sealed: true, doors: 4 });
  assert.deepEqual(incompatibleAttributeKeys(fields, { make: 'x', legacy_field: 'y' }), ['legacy_field']);
});

test('a reconciliation report becomes a sentence the operator can act on', () => {
  assert.equal(
    reconciliationSummary({ schemaVersion: 2, kept: ['model'], cleared: ['make', 'colour'], reason: 'Revalidated against the electronics schema v2' }),
    'Revalidated against the electronics schema v2. 1 value kept, and 2 cleared: make, colour.',
  );
  assert.equal(reconciliationSummary({ schemaVersion: 1, kept: ['model', 'brand'], cleared: [], reason: null }), '2 values carried over.');
  assert.equal(reconciliationSummary(null), null);
});

test('autosave never reports saved after a failure, or lets a stale response win', () => {
  let track = initialSaveTrack(1);
  assert.equal(saveStatusText(track), 'No changes yet');

  track = markDirty(track);
  assert.equal(saveStatusText(track), 'Unsaved changes');

  // Two saves in flight: the older one fails after the newer one succeeded.
  track = beginSave(track);
  const olderTicket = track.ticket;
  track = beginSave(track);
  const newerTicket = track.ticket;
  assert.equal(newerTicket, olderTicket + 1);

  track = completeSave(track, newerTicket, { ok: true, version: 4 });
  assert.equal(track.status, 'saved');
  assert.equal(track.version, 4);

  // The stale failure is ignored: it describes a request nobody is waiting for any more.
  const afterStaleFailure = completeSave(track, olderTicket, { ok: false, conflict: false, message: 'network down' });
  assert.deepEqual(afterStaleFailure, track);
  assert.equal(saveStatusText(afterStaleFailure), 'Saved');
});

test('a save response is only written back over the form when nothing changed meanwhile', () => {
  const sent = JSON.stringify({ title: { en: 'Draft' }, media: [] });
  const afterAttach = JSON.stringify({ title: { en: 'Draft' }, media: [{ assetId: 'm_1' }] });

  // Nothing was edited while the request was in flight: adopting the server state is correct.
  assert.equal(shouldAdoptServerForm(sent, sent), true);
  // An image was attached while the earlier save was running: the response describes a document
  // that no longer exists locally, so it must not be written back over that edit.
  assert.equal(shouldAdoptServerForm(sent, afterAttach), false);
});

test('a conflict is reported with the server’s version so the editor knows to reload', () => {
  let track = beginSave(markDirty(initialSaveTrack(3)));
  const ticket = track.ticket;
  track = completeSave(track, ticket, { ok: false, conflict: true, message: 'This listing changed since you loaded it', currentVersion: 9 });
  assert.equal(track.status, 'conflict');
  assert.equal(track.version, 9);
  assert.match(saveStatusText(track), /Someone else changed this listing/);

  // A later successful save of the newest request clears the conflict.
  track = beginSave(track);
  track = completeSave(track, track.ticket, { ok: true, version: 10 });
  assert.equal(track.status, 'saved');
});

test('browse state round-trips through a canonical URL', () => {
  const state = parseBrowseState(new URLSearchParams('q=patrol&category=vehicles&method=auction&sort=title&page=3'));
  assert.deepEqual(state, {
    q: 'patrol',
    audience: '',
    category: 'vehicles',
    method: 'auction',
    condition: '',
    city: '',
    featured: false,
    sort: 'title',
    page: 3,
  });
  assert.equal(browseQuery(state), 'q=patrol&category=vehicles&method=auction&sort=title&page=3');
  assert.equal(browseQuery(parseBrowseState(new URLSearchParams(''))), '', 'the default state has an empty query string');
});

test('a malformed URL is repaired instead of trusted', () => {
  const state = parseBrowseState(
    new URLSearchParams('sort=random&page=-4&limit=999&method=raffle&condition=exploded&category=A&city=%20&featured=maybe'),
  );
  assert.equal(state.sort, 'recent');
  assert.equal(state.page, 1);
  assert.equal(state.method, '');
  assert.equal(state.condition, '');
  assert.equal(state.category, '');
  assert.equal(state.city, '');
  assert.equal(state.featured, false);
  assert.equal(browseQuery(state), '');

  const huge = parseBrowseState(new URLSearchParams(`page=99999&q=${'x'.repeat(400)}`));
  assert.equal(huge.page, 1);
  assert.equal(huge.q.length, 120, 'an absurd search string is bounded');
});

test('changing a filter resets the page, changing the page does not', () => {
  const onPage4 = { ...parseBrowseState(new URLSearchParams('category=vehicles&page=4')) };
  assert.equal(onPage4.page, 4);
  assert.equal(applyBrowseChange(onPage4, { page: 5 }).page, 5);
  assert.equal(applyBrowseChange(onPage4, { q: 'patrol' }).page, 1);
  assert.equal(applyBrowseChange(onPage4, { category: 'cars' }).page, 1);
  assert.equal(applyBrowseChange(onPage4, { method: 'auction' }).page, 1);
  assert.equal(applyBrowseChange(onPage4, { audience: 'women' }).page, 1);
});

test('audience round-trips in browse URLs', () => {
  const state = parseBrowseState(new URLSearchParams('audience=women&category=electronics'));
  assert.equal(state.audience, 'women');
  assert.equal(browseQuery(state), 'audience=women&category=electronics');
  assert.equal(parseBrowseState(new URLSearchParams('audience=unisex')).audience, '');
});

test('media ordering keeps the cover attached to a real image', () => {
  const media = [
    { assetId: 'm_one', alt: { en: 'front', ar: null } },
    { assetId: 'm_two', alt: { en: null, ar: null } },
  ];
  assert.deepEqual(moveMedia(media, 0, 1).map((entry) => entry.assetId), ['m_two', 'm_one']);
  assert.deepEqual(moveMedia(media, 5, 0), media);

  assert.equal(coverAfterChange(media, 'm_two'), 'm_two');
  assert.equal(coverAfterChange(media, 'm_gone'), 'm_one', 'an unknown cover falls back to the first image');
  assert.equal(coverAfterChange(media, null), 'm_one');
  assert.equal(coverAfterChange([], 'm_one'), null, 'a listing with no images has no cover');

  assert.deepEqual(mediaPayload([{ assetId: 'm_one', alt: { en: ' front ', ar: '  ' } }]), [
    { assetId: 'm_one', alt: { en: 'front', ar: null } },
  ]);
});

test('a card falls back to the first image when the cover is missing', () => {
  assert.equal(coverImage({ coverAssetId: 'm_two', media: [{ assetId: 'm_one', url: '/a' }, { assetId: 'm_two', url: '/b' }] }), '/b');
  assert.equal(coverImage({ coverAssetId: 'm_missing', media: [{ assetId: 'm_one', url: '/a' }] }), '/a');
  assert.equal(coverImage({ coverAssetId: null, media: [] }), null);
});
