import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'app/admin/listings/[ref]/page.tsx');
let s = readFileSync(path, 'utf8');

if (!s.includes('useUiLocale')) {
  s = s.replace(
    "import { useSession } from '../../../../lib/session';",
    "import { useSession } from '../../../../lib/session';\nimport { useUiLocale } from '../../../../lib/UiLocaleProvider';\nimport { conditionLabel, methodLabel } from '../../../../lib/uiMessages';",
  );
}

s = s.replace(
  `const STEP_LABEL: Record<Step, string> = {
  basics: 'Basics',
  content: 'The ad',
  attributes: 'Details',
  media: 'Photos',
  review: 'Publish',
};

function scrollToFirstListingError`,
  `function scrollToFirstListingError`,
);

if (!s.includes('const { t, lang } = useUiLocale()')) {
  s = s.replace(
    'export default function AdminListingWizardPage() {\n  const params = useParams<{ ref: string }>();',
    `export default function AdminListingWizardPage() {
  const { t, lang } = useUiLocale();
  const params = useParams<{ ref: string }>();`,
  );
}

const pairs = [
  ['title="Listing"', 'title={t(\'admin.wizard.listing\')}'],
  ['>Loading…<', '>{t(\'admin.common.loading\')}<'],
  ["loadError ?? 'This listing could not be loaded.'", "loadError ?? t('admin.wizard.loadFailed')"],
  ['>Retry<', '>{t(\'admin.common.retry\')}<'],
  ['Back to listings', "{t('admin.wizard.backToListings')}"],
  ["?? 'Untitled draft'", "?? t('admin.wizard.untitledDraft')"],
  ['All listings', "{t('admin.wizard.allListings')}"],
  ["track.message ?? 'This listing changed elsewhere.'", "track.message ?? t('admin.wizard.conflictDefault')"],
  ["setNotice('Reloaded the server version. Local unsaved edits were discarded.')", "setNotice(t('admin.wizard.reloadedNotice'))"],
  ['Reload server version', "{t('admin.wizard.reloadServer')}"],
  ['aria-label="Confirm category change"', "aria-label={t('admin.wizard.confirmCategoryAria')}"],
  ['aria-label="Wizard steps"', "aria-label={t('admin.wizard.stepsAria')}"],
  ['{STEP_LABEL[entry]}', "{t(`admin.wizard.step.${entry}`)}"],
  ['<Label htmlFor="w-category">Category</Label>', '<Label htmlFor="w-category">{t(\'admin.field.category\')}</Label>'],
  ["? ' (archived)' : ''}", "? ` ${t('admin.wizard.archivedCat')}` : ''}"],
  ['<Label htmlFor="w-audience">Audience</Label>', '<Label htmlFor="w-audience">{t(\'admin.field.audience\')}</Label>'],
  ['<option value="">Choose Men, Women or Unisex…</option>', '<option value="">{t(\'admin.wizard.chooseAudience\')}</option>'],
  ['<Label htmlFor="w-method">Listing method</Label>', '<Label htmlFor="w-method">{t(\'admin.field.listingMethod\')}</Label>'],
  ['{METHOD_LABEL[method]}', '{methodLabel(lang, method)}'],
  ['<Label htmlFor="w-price">Price (QAR)</Label>', '<Label htmlFor="w-price">{t(\'admin.field.priceQar\')}</Label>'],
  ['<Label htmlFor="w-language">Advertisement language</Label>', '<Label htmlFor="w-language">{t(\'admin.field.adLanguage\')}</Label>'],
  ['<option value="en">English only</option>', '<option value="en">{t(\'admin.wizard.langEnOnly\')}</option>'],
  ['<option value="ar">Arabic only</option>', '<option value="ar">{t(\'admin.wizard.langArOnly\')}</option>'],
  ['<option value="both">English and Arabic</option>', '<option value="both">{t(\'admin.wizard.langBoth\')}</option>'],
  ['<Label htmlFor="w-condition">Condition</Label>', '<Label htmlFor="w-condition">{t(\'admin.field.condition\')}</Label>'],
  ['<option value="">Not stated</option>', '<option value="">{t(\'admin.wizard.notStated\')}</option>'],
  ['{condition}', '{conditionLabel(lang, condition)}'],
  ['<Label htmlFor="w-location">Location</Label>', '<Label htmlFor="w-location">{t(\'admin.field.location\')}</Label>'],
  ['<option value="">No public location</option>', '<option value="">{t(\'admin.wizard.noPublicLocation\')}</option>'],
  ["? ' (inactive)' : ''}", "? ` ${t('admin.wizard.inactiveLoc')}` : ''}"],
  ['<Label htmlFor="w-featured">Featured</Label>', '<Label htmlFor="w-featured">{t(\'admin.wizard.featuredLabel\')}</Label>'],
  ['label="Show in featured sections"', "label={t('admin.wizard.featuredToggle')}"],
  ['<Label htmlFor="w-notes">Private staff notes</Label>', '<Label htmlFor="w-notes">{t(\'admin.wizard.privateStaffNotes\')}</Label>'],
  ['Continue to content', "{t('admin.wizard.continueContent')}"],
  ['Save now', "{t('admin.wizard.saveNow')}"],
  ['Public address', "{t('admin.wizard.publicAddress')}"],
  ["locale === 'en' ? 'English advertisement' : 'Arabic advertisement'", "locale === 'en' ? t('admin.wizard.adLocaleEn') : t('admin.wizard.adLocaleAr')"],
  ['>Title ({locale})<', '>{t(\'admin.wizard.titleLocale\', { locale })}<'],
  ['>Description ({locale})<', '>{t(\'admin.wizard.descLocale\', { locale })}<'],
  ['Continue to attributes', "{t('admin.wizard.continueAttributes')}"],
  ['>Back<', '>{t(\'admin.wizard.back\')}<'],
  ['Continue to media', "{t('admin.wizard.continueMedia')}"],
  ['Save attributes', "{t('admin.wizard.saveAttributes')}"],
  ['<option value="">Not set</option>', '<option value="">{t(\'admin.wizard.notSet\')}</option>'],
  ["? 'Yes' : form.attributes[entry.key] === false ? 'No' : 'Not set'", "? t('admin.wizard.yes') : form.attributes[entry.key] === false ? t('admin.wizard.no') : t('admin.wizard.notSet')"],
  ["{entry.adminOnly ? ' · staff only' : ''}", "{entry.adminOnly ? ` ${t('admin.wizard.staffOnly')}` : ''}"],
  ['Continue to review', "{t('admin.wizard.continueReview')}"],
  ['Save media order', "{t('admin.wizard.saveMediaOrder')}"],
  ['Drop an image here or click to upload', "{t('admin.wizard.uploadZoneTitle')}"],
  ['Uploading… {progress}%', "{t('admin.wizard.uploading', { pct: progress })}"],
  ['<summary>Collection assets ({assets.length})</summary>', '<summary>{t(\'admin.wizard.collectionAssets\', { count: assets.length })}</summary>'],
  ['label="Collection assets"', "label={t('admin.wizard.collectionAssets', { count: assets.length })}"],
  ["Every upload in this listing&apos;s collection, including the ones the server refused.", "{t('admin.wizard.collectionAssetsCaption')}"],
  ['<th scope="col">Asset</th>', '<th scope="col">{t(\'admin.wizard.colAsset\')}</th>'],
  ['<th scope="col">Status</th>', '<th scope="col">{t(\'admin.wizard.colStatus\')}</th>'],
  ['<th scope="col">Size</th>', '<th scope="col">{t(\'admin.wizard.colSize\')}</th>'],
  ['<th scope="col">In this listing</th>', '<th scope="col">{t(\'admin.wizard.colInListing\')}</th>'],
  ['label="Attached"', "label={t('admin.wizard.attached')}"],
  ['>not available<', '>{t(\'admin.wizard.notAvailable\')}<'],
  ['This listing has no images yet. Upload at least one to publish.', "{t('admin.wizard.noImagesListing')}"],
  ['<div className="ph">Preview unavailable</div>', '<div className="ph">{t(\'admin.wizard.previewUnavailable\')}</div>'],
  ['<Badge tone="good">Cover</Badge>', '<Badge tone="good">{t(\'admin.wizard.cover\')}</Badge>'],
  ['>Alt (EN)<', '>{t(\'admin.wizard.altEn\')}<'],
  ['>Alt (AR)<', '>{t(\'admin.wizard.altAr\')}<'],
  ['title="Move earlier"', "title={t('admin.media.moveEarlier')}"],
  ['title="Move later"', "title={t('admin.media.moveLater')}"],
  ['>Cover<', '>{t(\'admin.wizard.cover\')}<'],
  ['>Remove<', '>{t(\'admin.wizard.remove\')}<'],
  ['<div className="lbl">Record</div>', '<div className="lbl">{t(\'admin.wizard.record\')}</div>'],
  ['<div className="lbl">Content language</div>', '<div className="lbl">{t(\'admin.wizard.contentLanguage\')}</div>'],
  ['<div className="lbl">Images</div>', '<div className="lbl">{t(\'admin.wizard.images\')}</div>'],
  ['<div className="lbl">References</div>', '<div className="lbl">{t(\'admin.wizard.references\')}</div>'],
  ["? 'Advertisement language is complete'", "? t('admin.wizard.checklistLangOk')"],
  ["? 'At least one image attached'", "? t('admin.wizard.checklistImagesOk')"],
  [": 'Publication needs at least one image'", ": t('admin.wizard.checklistImagesBad')"],
  ["? 'Required category details are set'", "? t('admin.wizard.checklistAttrsOk')"],
  ['Publish listing', "{t('admin.wizard.publishListing')}"],
  ['Publish again', "{t('admin.wizard.publishAgain')}"],
  ['View the public page →', "{t('admin.wizard.viewPublic')}"],
  ['Save draft', "{t('admin.wizard.saveDraft')}"],
  ['label="I reviewed the content, images and references"', "label={t('admin.wizard.confirmPublishImages')}"],
  ['<Label htmlFor="w-archive">Archive reason</Label>', '<Label htmlFor="w-archive">{t(\'admin.wizard.archiveReason\')}</Label>'],
  ['placeholder="Why is this listing coming down?"', "placeholder={t('admin.wizard.archivePlaceholder')}"],
  ['Archive listing', "{t('admin.wizard.archiveListing')}"],
  ['title="Server state" subtitle="What the record actually says, including the fields the public never sees."', "title={t('admin.wizard.serverState')} subtitle={t('admin.wizard.serverStateSub')}"],
  ['<dt className="lbl">Status</dt>', '<dt className="lbl">{t(\'admin.wizard.dtStatus\')}</dt>'],
  ['<dt className="lbl">Moderation</dt>', '<dt className="lbl">{t(\'admin.wizard.dtModeration\')}</dt>'],
  ['<dt className="lbl">Attribute schema</dt>', '<dt className="lbl">{t(\'admin.wizard.dtAttrSchema\')}</dt>'],
  ['<dt className="lbl">Media collection</dt>', '<dt className="lbl">{t(\'admin.wizard.dtMediaCollection\')}</dt>'],
  ['<dt className="lbl">Created by</dt>', '<dt className="lbl">{t(\'admin.wizard.dtCreatedBy\')}</dt>'],
  ['<dt className="lbl">Updated by</dt>', '<dt className="lbl">{t(\'admin.wizard.dtUpdatedBy\')}</dt>'],
  ['<dt className="lbl">Created</dt>', '<dt className="lbl">{t(\'admin.wizard.dtCreated\')}</dt>'],
  ['<dt className="lbl">Updated</dt>', '<dt className="lbl">{t(\'admin.wizard.dtUpdated\')}</dt>'],
  ['<dt className="lbl">Published</dt>', '<dt className="lbl">{t(\'admin.wizard.dtPublished\')}</dt>'],
  ['<dt className="lbl">Archived reason</dt>', '<dt className="lbl">{t(\'admin.wizard.dtArchivedReason\')}</dt>'],
];

for (const [from, to] of pairs) {
  if (!s.includes(from) && !from.startsWith('{condition}')) {
    console.warn('skip (missing):', from.slice(0, 60));
    continue;
  }
  s = s.split(from).join(to);
}

// Hints (multiline kept as single t keys)
const hintPairs = [
  [
    '<Hint>Attributes and location rules follow the category. Changing it revalidates stored values.</Hint>',
    "<Hint>{t('admin.wizard.hint.category')}</Hint>",
  ],
  [
    '<Hint>Required before publish. This is the primary shopper filter, not a category.</Hint>',
    "<Hint>{t('admin.wizard.hint.audience')}</Hint>",
  ],
  [
    '<Hint>A published listing is not a live auction: the auction engine arrives in the next phase.</Hint>',
    "<Hint>{t('admin.wizard.hint.auctionMethod')}</Hint>",
  ],
  [
    `                <Hint>
                  This is the language of the advertisement itself, not a translation of this interface. Publication
                  requires the content the selected mode promises.
                </Hint>`,
    "<Hint>{t('admin.wizard.hint.adLanguage')}</Hint>",
  ],
  [
    '<Hint>Also fills Category details → Condition (refurbished maps to Used).</Hint>',
    "<Hint>{t('admin.wizard.hint.condition')}</Hint>",
  ],
  [
    "<Hint>The location&apos;s own precision policy decides what the public page shows.</Hint>",
    "<Hint>{t('admin.wizard.hint.location')}</Hint>",
  ],
  [
    '<Hint>Featured placement is a staff decision; the public featured sections read it directly.</Hint>',
    "<Hint>{t('admin.wizard.hint.featured')}</Hint>",
  ],
  [
    '<Hint>Never published: this field is stripped from every public and customer response.</Hint>',
    "<Hint>{t('admin.wizard.hint.privateNotes')}</Hint>",
  ],
  [
    '<Hint>When empty, Basics → Condition fills this automatically.</Hint>',
    "<Hint>{t('admin.wizard.hint.itemCondition')}</Hint>",
  ],
];

for (const [from, to] of hintPairs) {
  if (s.includes(from)) s = s.replace(from, to);
}

writeFileSync(path, s);
console.log('wizard i18n wire done');
