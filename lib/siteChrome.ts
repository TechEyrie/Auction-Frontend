import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import {
  ABOUT_LABEL_FIELDS,
  ACCOUNT_LABEL_FIELDS,
  AUCTIONS_LABEL_FIELDS,
  BROWSE_LABEL_FIELDS,
  CALENDAR_LABEL_FIELDS,
  CATEGORIES_LABEL_FIELDS,
  CONTACT_LABEL_FIELDS,
  HELP_LABEL_FIELDS,
  HOME_LABEL_FIELDS,
  LEGAL_LABEL_FIELDS,
  LOT_LABEL_FIELDS,
  PRODUCT_LABEL_FIELDS,
} from './chromePages';
import { useUiLocale } from './UiLocaleProvider';
import type { UiLang } from './uiLocale.ts';
import { translate, type MessageKey } from './uiMessages.ts';

export {
  ABOUT_LABEL_FIELDS,
  ACCOUNT_LABEL_FIELDS,
  AUCTIONS_LABEL_FIELDS,
  BROWSE_LABEL_FIELDS,
  CALENDAR_LABEL_FIELDS,
  CATEGORIES_LABEL_FIELDS,
  CONTACT_LABEL_FIELDS,
  HELP_LABEL_FIELDS,
  HOME_LABEL_FIELDS,
  LEGAL_LABEL_FIELDS,
  LOT_LABEL_FIELDS,
  PRODUCT_LABEL_FIELDS,
} from './chromePages';

/** Keep in sync with `backend/src/modules/account/content-chrome.ts`. */
export const HEADER_LABEL_FIELDS = [
  'nav.auction',
  'nav.accessories',
  'nav.sell',
  'nav.how',
  'nav.shop',
  'nav.menu.liveAuctions.title',
  'nav.menu.liveAuctions.desc',
  'nav.menu.auctionCalendar.title',
  'nav.menu.auctionCalendar.desc',
  'nav.menu.auctionListings.title',
  'nav.menu.auctionListings.desc',
  'nav.menu.howBidding.title',
  'nav.menu.howBidding.desc',
  'nav.menu.browseAccessories.title',
  'nav.menu.browseAccessories.desc',
  'nav.menu.allCategories.title',
  'nav.menu.allCategories.desc',
  'nav.menu.forMen.title',
  'nav.menu.forMen.desc',
  'nav.menu.forWomen.title',
  'nav.menu.forWomen.desc',
  'nav.menu.forUnisex.title',
  'nav.menu.forUnisex.desc',
  'nav.menu.contactToSell.title',
  'nav.menu.contactToSell.desc',
  'nav.menu.aboutUs.title',
  'nav.menu.aboutUs.desc',
  'nav.menu.auctionProcess.title',
  'nav.menu.auctionProcess.desc',
  'nav.menu.helpCentre.title',
  'nav.menu.helpCentre.desc',
  'nav.menu.contact.title',
  'nav.menu.contact.desc',
  'nav.menu.allListings.title',
  'nav.menu.allListings.desc',
  'nav.menu.fixedPrice.title',
  'nav.menu.fixedPrice.desc',
  'nav.menu.auctions.title',
  'nav.menu.auctions.desc',
  'nav.menu.categories.title',
  'nav.menu.categories.desc',
  'header.search',
  'header.register',
  'header.account',
  'header.admin',
  'header.menu',
  'header.openMenu',
  'header.closeMenu',
  'header.siteMenu',
  'header.switchLanguage',
  'header.selectLanguage',
  'header.selectCity',
  'header.mainNav',
  'header.mobileNav',
  'header.brandHome',
  'header.brandName',
  'header.brandSub',
  'header.langName',
  'header.langCode',
  'header.searchOverlay',
  'header.closeSearch',
  'header.searchPlaceholder',
  'header.trending',
  'header.popularCategories',
  'header.popularCategoriesLoading',
  'header.popularCategoriesEmpty',
  'browse.allCities',
] as const;

export const FOOTER_LABEL_FIELDS = [
  'footer.tagline',
  'footer.marketplace',
  'footer.allCategories',
  'footer.liveAuctions',
  'footer.latestProducts',
  'footer.company',
  'footer.about',
  'footer.contact',
  'footer.help',
  'footer.helpCentre',
  'footer.safetyTips',
  'footer.terms',
  'footer.privacy',
  'footer.rights',
  'footer.languages',
  'footer.developedBy',
  'footer.brandName',
  'footer.brandSub',
] as const;

export const AUTH_LABEL_FIELDS = [
  'auth.pageTitle.signin',
  'auth.logoAlt',
  'auth.tablistAria',
  'auth.hero.welcome',
  'auth.hero.tagline',
  'auth.hero.bullet1',
  'auth.hero.bullet2',
  'auth.hero.bullet3',
  'auth.emailVerify.heading',
  'auth.verifyAndContinue',
  'auth.mfa.title',
  'auth.mfa.intro',
  'auth.mfa.recoveryCode',
  'auth.mfa.verificationCode',
  'auth.mfa.useAuthenticatorInstead',
  'auth.mfa.useRecoveryInstead',
  'auth.mfa.recoveryAccepted',
  'auth.tab.signIn',
  'auth.tab.createAccount',
  'auth.signIn.heading',
  'auth.signIn.submit',
  'auth.field.email',
  'auth.field.emailPlaceholder',
  'auth.field.password',
  'auth.field.fullName',
  'auth.forgotPassword',
  'auth.password.show',
  'auth.password.hide',
  'auth.keepSignedIn',
  'auth.register.heading',
  'auth.terms.prefix',
  'auth.terms.link',
  'auth.terms.and',
  'auth.terms.privacy',
  'auth.terms.suffix',
  'auth.register.submit',
  'auth.switch.newHere',
  'auth.switch.alreadyHave',
  'auth.switch.createAccount',
  'auth.switch.signIn',
  'auth.pleaseWait',
  'auth.login',
  'auth.signOut',
  'auth.backToSignIn',
  'auth.forgot.pageTitle',
  'auth.forgot.hero.title',
  'auth.forgot.hero.lead',
  'auth.forgot.success.title',
  'auth.forgot.success.body',
  'auth.forgot.form.title',
  'auth.forgot.submit',
  'auth.reset.pageTitle',
  'auth.reset.hero.title',
  'auth.reset.hero.lead',
  'auth.reset.loading',
  'auth.reset.invalid.title',
  'auth.reset.invalid.body',
  'auth.reset.requestNewLink',
  'auth.reset.form.title',
  'auth.reset.confirmPassword',
  'auth.reset.mismatch',
  'auth.reset.submit',
  'auth.account.mfa.title',
  'auth.account.mfa.enabledIntro',
  'auth.account.mfa.replace',
  'auth.account.mfa.currentCodeLabel',
  'auth.account.mfa.continue',
  'auth.account.mfa.cancel',
  'auth.account.mfa.qrAlt',
  'auth.account.mfa.manualKeyPrefix',
  'auth.account.mfa.newCodeLabel',
  'auth.account.mfa.confirmNew',
  'auth.account.mfa.saveRecovery',
  'auth.account.mfa.done',
] as const;

export const CHROME_DOC_KEYS = [
  'header',
  'footer',
  'auth',
  'home',
  'browse',
  'auctions',
  'calendar',
  'help',
  'about',
  'legal',
  'contact',
  'categories',
  'product',
  'lot',
  'account',
] as const;

export type ChromeDocKey = (typeof CHROME_DOC_KEYS)[number];

export type ChromeLocaleLabels = Partial<Record<string, string>>;
export type ChromeBody = { en: ChromeLocaleLabels; ar: ChromeLocaleLabels };

type ChromeDocResponse = {
  key: string;
  version: number;
  body: ChromeBody;
  publishedAt?: string;
};

export type ChromeFieldMeta = {
  key: string;
  label: string;
  hint?: string;
  group?: string;
};

/** Header CMS — top bar in page order. Login / Sign out are under Sign in / Sign out. */
export const HEADER_CMS_META: ChromeFieldMeta[] = [
  { key: 'header.brandName', label: 'Logo line 1', group: 'Logo', hint: 'First line next to the logo image.' },
  { key: 'header.brandSub', label: 'Logo line 2 (gold subtitle)', group: 'Logo' },
  { key: 'nav.auction', label: 'Auction', group: 'Top navigation' },
  { key: 'nav.accessories', label: 'Accessories', group: 'Top navigation' },
  { key: 'nav.sell', label: 'Sell', group: 'Top navigation' },
  { key: 'nav.how', label: 'How it works', group: 'Top navigation' },
  { key: 'nav.shop', label: 'Shop', group: 'Top navigation' },
  { key: 'nav.menu.liveAuctions.title', label: 'Live auctions', group: 'Auction menu' },
  { key: 'nav.menu.liveAuctions.desc', label: 'Live auctions — short description', group: 'Auction menu' },
  { key: 'nav.menu.auctionCalendar.title', label: 'Auction calendar', group: 'Auction menu' },
  { key: 'nav.menu.auctionCalendar.desc', label: 'Auction calendar — short description', group: 'Auction menu' },
  { key: 'nav.menu.auctionListings.title', label: 'Auction listings', group: 'Auction menu' },
  { key: 'nav.menu.auctionListings.desc', label: 'Auction listings — short description', group: 'Auction menu' },
  { key: 'nav.menu.howBidding.title', label: 'How bidding works', group: 'Auction menu' },
  { key: 'nav.menu.howBidding.desc', label: 'How bidding works — short description', group: 'Auction menu' },
  { key: 'nav.menu.browseAccessories.title', label: 'Browse accessories', group: 'Accessories menu' },
  { key: 'nav.menu.browseAccessories.desc', label: 'Browse accessories — short description', group: 'Accessories menu' },
  { key: 'nav.menu.forMen.title', label: 'For men', group: 'Accessories menu' },
  { key: 'nav.menu.forMen.desc', label: 'For men — short description', group: 'Accessories menu' },
  { key: 'nav.menu.forWomen.title', label: 'For women', group: 'Accessories menu' },
  { key: 'nav.menu.forWomen.desc', label: 'For women — short description', group: 'Accessories menu' },
  { key: 'nav.menu.forUnisex.title', label: 'For unisex', group: 'Accessories menu' },
  { key: 'nav.menu.forUnisex.desc', label: 'For unisex — short description', group: 'Accessories menu' },
  { key: 'nav.menu.allCategories.title', label: 'All categories', group: 'Accessories menu' },
  { key: 'nav.menu.allCategories.desc', label: 'All categories — short description', group: 'Accessories menu' },
  { key: 'nav.menu.contactToSell.title', label: 'Contact to sell', group: 'Sell menu' },
  { key: 'nav.menu.contactToSell.desc', label: 'Contact to sell — short description', group: 'Sell menu' },
  { key: 'nav.menu.aboutUs.title', label: 'About us', group: 'Sell menu' },
  { key: 'nav.menu.aboutUs.desc', label: 'About us — short description', group: 'Sell menu' },
  { key: 'nav.menu.auctionProcess.title', label: 'Auction process', group: 'How it works menu' },
  { key: 'nav.menu.auctionProcess.desc', label: 'Auction process — short description', group: 'How it works menu' },
  { key: 'nav.menu.helpCentre.title', label: 'Help centre', group: 'How it works menu' },
  { key: 'nav.menu.helpCentre.desc', label: 'Help centre — short description', group: 'How it works menu' },
  { key: 'nav.menu.contact.title', label: 'Contact', group: 'How it works menu' },
  { key: 'nav.menu.contact.desc', label: 'Contact — short description', group: 'How it works menu' },
  { key: 'nav.menu.allListings.title', label: 'All listings', group: 'Shop menu' },
  { key: 'nav.menu.allListings.desc', label: 'All listings — short description', group: 'Shop menu' },
  { key: 'nav.menu.fixedPrice.title', label: 'Fixed price', group: 'Shop menu' },
  { key: 'nav.menu.fixedPrice.desc', label: 'Fixed price — short description', group: 'Shop menu' },
  { key: 'nav.menu.auctions.title', label: 'Auctions', group: 'Shop menu' },
  { key: 'nav.menu.auctions.desc', label: 'Auctions — short description', group: 'Shop menu' },
  { key: 'nav.menu.categories.title', label: 'Categories', group: 'Shop menu' },
  { key: 'nav.menu.categories.desc', label: 'Categories — short description', group: 'Shop menu' },
  { key: 'browse.allCities', label: '“All cities” in the place picker', group: 'Place filter' },
  { key: 'header.search', label: 'Search button', group: 'Top bar buttons' },
  { key: 'header.switchLanguage', label: 'Switch language', group: 'Top bar buttons' },
  { key: 'header.langName', label: 'Current language name', group: 'Top bar buttons', hint: 'e.g. English' },
  { key: 'header.langCode', label: 'Current language code', group: 'Top bar buttons', hint: 'e.g. EN' },
  { key: 'header.register', label: 'Register', group: 'Top bar buttons' },
  { key: 'header.account', label: 'Account', group: 'Top bar buttons' },
  { key: 'header.admin', label: 'Admin', group: 'Top bar buttons', hint: 'Shown for staff only.' },
  { key: 'header.searchOverlay', label: 'Search panel title', group: 'Search panel' },
  { key: 'header.searchPlaceholder', label: 'Search box placeholder', group: 'Search panel' },
  { key: 'header.trending', label: '“Trending” heading', group: 'Search panel' },
  { key: 'header.popularCategories', label: '“Popular categories” heading', group: 'Search panel' },
  { key: 'header.popularCategoriesLoading', label: 'Categories loading message', group: 'Search panel' },
  { key: 'header.popularCategoriesEmpty', label: 'No categories message', group: 'Search panel' },
  { key: 'header.menu', label: 'Mobile menu heading', group: 'Mobile menu' },
  { key: 'header.brandHome', label: 'Logo link (screen reader)', group: 'Screen readers (optional)' },
  { key: 'header.openMenu', label: 'Open menu button', group: 'Screen readers (optional)' },
  { key: 'header.closeMenu', label: 'Close menu button', group: 'Screen readers (optional)' },
  { key: 'header.siteMenu', label: 'Mobile menu dialog', group: 'Screen readers (optional)' },
  { key: 'header.selectLanguage', label: 'Language picker', group: 'Screen readers (optional)' },
  { key: 'header.selectCity', label: 'City picker', group: 'Screen readers (optional)' },
  { key: 'header.mainNav', label: 'Main navigation landmark', group: 'Screen readers (optional)' },
  { key: 'header.mobileNav', label: 'Mobile navigation landmark', group: 'Screen readers (optional)' },
  { key: 'header.closeSearch', label: 'Close search button', group: 'Screen readers (optional)' },
];

export const HEADER_FIELD_META: ChromeFieldMeta[] = HEADER_CMS_META;

/** Footer CMS — columns top to bottom, same order as the live footer. */
export const FOOTER_CMS_META: ChromeFieldMeta[] = [
  { key: 'footer.brandName', label: 'Logo line 1', group: 'Brand block' },
  { key: 'footer.brandSub', label: 'Logo line 2 (gold subtitle)', group: 'Brand block' },
  { key: 'footer.tagline', label: 'Tagline under the logo', group: 'Brand block' },
  { key: 'footer.marketplace', label: 'Column heading', group: 'Marketplace links' },
  { key: 'footer.allCategories', label: 'All categories', group: 'Marketplace links' },
  { key: 'footer.liveAuctions', label: 'Live auctions', group: 'Marketplace links' },
  { key: 'footer.latestProducts', label: 'Latest products', group: 'Marketplace links' },
  { key: 'footer.company', label: 'Column heading', group: 'Company links' },
  { key: 'footer.about', label: 'About', group: 'Company links' },
  { key: 'footer.contact', label: 'Contact', group: 'Company links' },
  { key: 'footer.help', label: 'Column heading', group: 'Help links' },
  { key: 'footer.helpCentre', label: 'Help centre', group: 'Help links' },
  { key: 'footer.safetyTips', label: 'Safety tips', group: 'Help links' },
  { key: 'footer.terms', label: 'Terms', group: 'Help links' },
  { key: 'footer.privacy', label: 'Privacy', group: 'Help links' },
  { key: 'footer.rights', label: 'Copyright line', group: 'Bottom bar' },
  { key: 'footer.languages', label: 'Language note', group: 'Bottom bar' },
  { key: 'footer.developedBy', label: 'Developed by line', group: 'Bottom bar' },
];

export const FOOTER_FIELD_META: ChromeFieldMeta[] = FOOTER_CMS_META;

export const AUTH_FIELD_META: ChromeFieldMeta[] = [
  { key: 'auth.pageTitle.signin', label: 'Page title (sign-in)', group: 'Sign in', hint: 'Browser tab title' },
  { key: 'auth.logoAlt', label: 'Logo alt text', group: 'Shared', hint: 'Hero logo on auth layouts' },
  { key: 'auth.tablistAria', label: 'Account tabs (aria)', group: 'Shared' },
  { key: 'auth.hero.welcome', label: 'Hero headline', group: 'Shared' },
  { key: 'auth.hero.tagline', label: 'Hero tagline', group: 'Shared' },
  { key: 'auth.hero.bullet1', label: 'Hero bullet 1', group: 'Shared' },
  { key: 'auth.hero.bullet2', label: 'Hero bullet 2', group: 'Shared' },
  { key: 'auth.hero.bullet3', label: 'Hero bullet 3', group: 'Shared' },
  { key: 'auth.emailVerify.heading', label: 'Verify email heading', group: 'Create account', hint: 'Heading only; inbox copy stays in uiMessages' },
  { key: 'auth.verifyAndContinue', label: 'Verify and continue', group: 'Shared', hint: 'OTP and MFA submit buttons' },
  { key: 'auth.mfa.title', label: 'Two-step verification title', group: 'Account MFA' },
  { key: 'auth.mfa.intro', label: 'Two-step verification intro', group: 'Account MFA' },
  { key: 'auth.mfa.recoveryCode', label: 'Recovery code label', group: 'Account MFA' },
  { key: 'auth.mfa.verificationCode', label: 'Verification code label', group: 'Account MFA' },
  { key: 'auth.mfa.useAuthenticatorInstead', label: 'Use authenticator instead', group: 'Account MFA' },
  { key: 'auth.mfa.useRecoveryInstead', label: 'Use recovery code instead', group: 'Account MFA' },
  { key: 'auth.mfa.recoveryAccepted', label: 'Recovery accepted notice', group: 'Account MFA', hint: 'Use {remaining} for codes left' },
  { key: 'auth.tab.signIn', label: 'Tab: Sign in', group: 'Sign in' },
  { key: 'auth.tab.createAccount', label: 'Tab: Create account', group: 'Create account' },
  { key: 'auth.signIn.heading', label: 'Sign-in form heading', group: 'Sign in' },
  { key: 'auth.signIn.submit', label: 'Sign-in submit', group: 'Sign in' },
  { key: 'auth.field.email', label: 'Email label', group: 'Shared' },
  { key: 'auth.field.emailPlaceholder', label: 'Email placeholder', group: 'Shared' },
  { key: 'auth.field.password', label: 'Password label', group: 'Shared' },
  { key: 'auth.field.fullName', label: 'Full name label', group: 'Create account' },
  { key: 'auth.forgotPassword', label: 'Forgot password link', group: 'Sign in' },
  { key: 'auth.password.show', label: 'Show password', group: 'Shared' },
  { key: 'auth.password.hide', label: 'Hide password', group: 'Shared' },
  { key: 'auth.keepSignedIn', label: 'Keep me signed in', group: 'Sign in' },
  { key: 'auth.register.heading', label: 'Register heading', group: 'Create account' },
  { key: 'auth.terms.prefix', label: 'Terms checkbox prefix', group: 'Create account' },
  { key: 'auth.terms.link', label: 'Terms link text', group: 'Create account' },
  { key: 'auth.terms.and', label: 'Terms checkbox “and”', group: 'Create account' },
  { key: 'auth.terms.privacy', label: 'Privacy link text', group: 'Create account' },
  { key: 'auth.terms.suffix', label: 'Terms checkbox suffix', group: 'Create account' },
  { key: 'auth.register.submit', label: 'Create account submit', group: 'Create account' },
  { key: 'auth.switch.newHere', label: 'Switch: New here?', group: 'Sign in' },
  { key: 'auth.switch.alreadyHave', label: 'Switch: Already have account?', group: 'Create account' },
  { key: 'auth.switch.createAccount', label: 'Switch: Create an account', group: 'Sign in' },
  { key: 'auth.switch.signIn', label: 'Switch: Sign in', group: 'Create account' },
  { key: 'auth.pleaseWait', label: 'Busy button text', group: 'Shared', hint: 'Replaces the submit label while the form is sending' },
  { key: 'auth.login', label: 'Sign in', group: 'Sign in' },
  { key: 'auth.signOut', label: 'Sign out', group: 'Sign in' },
  { key: 'auth.backToSignIn', label: 'Back to sign in', group: 'Forgot password' },
  { key: 'auth.forgot.pageTitle', label: 'Page title', group: 'Forgot password' },
  { key: 'auth.forgot.hero.title', label: 'Hero title', group: 'Forgot password' },
  { key: 'auth.forgot.hero.lead', label: 'Hero lead', group: 'Forgot password' },
  { key: 'auth.forgot.success.title', label: 'Success title', group: 'Forgot password' },
  { key: 'auth.forgot.success.body', label: 'Success message', group: 'Forgot password' },
  { key: 'auth.forgot.form.title', label: 'Form title', group: 'Forgot password' },
  { key: 'auth.forgot.submit', label: 'Send reset link', group: 'Forgot password' },
  { key: 'auth.reset.pageTitle', label: 'Page title', group: 'Reset password' },
  { key: 'auth.reset.hero.title', label: 'Hero title', group: 'Reset password' },
  { key: 'auth.reset.hero.lead', label: 'Hero lead', group: 'Reset password' },
  { key: 'auth.reset.loading', label: 'Loading…', group: 'Reset password' },
  { key: 'auth.reset.invalid.title', label: 'Invalid link title', group: 'Reset password' },
  { key: 'auth.reset.invalid.body', label: 'Invalid link message', group: 'Reset password' },
  { key: 'auth.reset.requestNewLink', label: 'Request a new link', group: 'Reset password' },
  { key: 'auth.reset.form.title', label: 'Form title', group: 'Reset password' },
  { key: 'auth.reset.confirmPassword', label: 'Confirm password label', group: 'Reset password' },
  { key: 'auth.reset.mismatch', label: 'Passwords do not match', group: 'Reset password' },
  { key: 'auth.reset.submit', label: 'Update password submit', group: 'Reset password' },
  { key: 'auth.account.mfa.title', label: 'Authenticator section title', group: 'Account MFA' },
  { key: 'auth.account.mfa.enabledIntro', label: 'MFA enabled intro', group: 'Account MFA' },
  { key: 'auth.account.mfa.replace', label: 'Replace authenticator', group: 'Account MFA' },
  { key: 'auth.account.mfa.currentCodeLabel', label: 'Current code label', group: 'Account MFA' },
  { key: 'auth.account.mfa.continue', label: 'Continue', group: 'Account MFA' },
  { key: 'auth.account.mfa.cancel', label: 'Cancel', group: 'Account MFA' },
  { key: 'auth.account.mfa.qrAlt', label: 'QR code alt', group: 'Account MFA' },
  { key: 'auth.account.mfa.manualKeyPrefix', label: 'Manual key prefix', group: 'Account MFA' },
  { key: 'auth.account.mfa.newCodeLabel', label: 'New app code label', group: 'Account MFA' },
  { key: 'auth.account.mfa.confirmNew', label: 'Confirm new authenticator', group: 'Account MFA' },
  { key: 'auth.account.mfa.saveRecovery', label: 'Save recovery codes notice', group: 'Account MFA' },
  { key: 'auth.account.mfa.done', label: 'Done', group: 'Account MFA' },
];

export function authMetaForNav(group: string, extraKeys: readonly string[] = []): ChromeFieldMeta[] {
  return AUTH_FIELD_META.filter((field) => field.group === group || extraKeys.includes(field.key));
}

export const AUTH_SHARED_SIGNIN = [
  'auth.logoAlt',
  'auth.field.email',
  'auth.field.emailPlaceholder',
  'auth.field.password',
  'auth.password.show',
  'auth.password.hide',
  'auth.pleaseWait',
] as const;

/** Sign-in CMS only — login form + left welcome. No sign-out, signup, or forgot-password. */
export const SIGN_IN_CMS_META: ChromeFieldMeta[] = [
  { key: 'auth.login', label: 'Sign in', group: 'Sign in / Sign out', hint: 'Header button when logged out.' },
  { key: 'auth.signOut', label: 'Sign out', group: 'Sign in / Sign out', hint: 'Header button when logged in.' },
  { key: 'auth.pageTitle.signin', label: 'Browser tab', group: 'Sign-in page', hint: 'Text in the browser tab on the Sign in page.' },
  { key: 'auth.hero.welcome', label: 'Welcome headline', group: 'Left side', hint: 'Big heading on the dark left panel.' },
  { key: 'auth.hero.tagline', label: 'Welcome line under the headline', group: 'Left side' },
  { key: 'auth.hero.bullet1', label: 'Welcome bullet 1', group: 'Left side' },
  { key: 'auth.hero.bullet2', label: 'Welcome bullet 2', group: 'Left side' },
  { key: 'auth.hero.bullet3', label: 'Welcome bullet 3', group: 'Left side' },
  { key: 'auth.tab.signIn', label: 'Sign in tab', group: 'The form', hint: 'The tab at the top of the form.' },
  { key: 'auth.signIn.heading', label: 'Form title', group: 'The form' },
  { key: 'auth.field.email', label: 'Email', group: 'The form' },
  { key: 'auth.field.emailPlaceholder', label: 'Grey text inside the email box', group: 'The form' },
  { key: 'auth.field.password', label: 'Password', group: 'The form' },
  { key: 'auth.password.show', label: 'Show password', group: 'The form' },
  { key: 'auth.password.hide', label: 'Hide password', group: 'The form' },
  { key: 'auth.forgotPassword', label: 'Forgot password? link', group: 'The form' },
  { key: 'auth.keepSignedIn', label: 'Keep me signed in', group: 'The form' },
  { key: 'auth.signIn.submit', label: 'Sign in button', group: 'The form' },
  { key: 'auth.pleaseWait', label: 'Button text while loading', group: 'The form', hint: 'Replaces the Sign in button for a moment after they click. This is not a box on the form.' },
  { key: 'auth.switch.newHere', label: '“New here?”', group: 'Bottom of the form' },
  { key: 'auth.switch.createAccount', label: 'Create an account link', group: 'Bottom of the form' },
];

export {
  ABOUT_CMS_META,
  ACCOUNT_CMS_META,
  AUCTIONS_CMS_META,
  BROWSE_CMS_META,
  CALENDAR_CMS_META,
  CATEGORIES_CMS_META,
  CONTACT_CMS_META,
  HELP_CMS_META,
  HOME_CMS_META,
  LEGAL_CMS_META,
  PRODUCT_CMS_META,
} from './chromePageMeta';

export const CREATE_ACCOUNT_CMS_META: ChromeFieldMeta[] = [
  { key: 'auth.tab.createAccount', label: 'Create account tab', group: 'The form' },
  { key: 'auth.register.heading', label: 'Form title', group: 'The form' },
  { key: 'auth.field.fullName', label: 'Full name', group: 'The form' },
  { key: 'auth.field.email', label: 'Email', group: 'The form' },
  { key: 'auth.field.emailPlaceholder', label: 'Grey text inside the email box', group: 'The form' },
  { key: 'auth.field.password', label: 'Password', group: 'The form' },
  { key: 'auth.password.show', label: 'Show password', group: 'The form' },
  { key: 'auth.password.hide', label: 'Hide password', group: 'The form' },
  { key: 'auth.terms.prefix', label: 'Before the Terms link', group: 'Terms line' },
  { key: 'auth.terms.link', label: 'Terms link', group: 'Terms line' },
  { key: 'auth.terms.and', label: 'The word “and”', group: 'Terms line' },
  { key: 'auth.terms.privacy', label: 'Privacy link', group: 'Terms line' },
  { key: 'auth.terms.suffix', label: 'After the Privacy link', group: 'Terms line' },
  { key: 'auth.register.submit', label: 'Create account button', group: 'The form' },
  { key: 'auth.pleaseWait', label: 'Button text while loading', group: 'The form' },
  { key: 'auth.emailVerify.heading', label: 'Check-your-email heading', group: 'After they register' },
  { key: 'auth.verifyAndContinue', label: 'Verify button', group: 'After they register' },
  { key: 'auth.switch.alreadyHave', label: '“Already have an account?”', group: 'Bottom of the form' },
  { key: 'auth.switch.signIn', label: 'Sign in link', group: 'Bottom of the form' },
];

/** Forgot password page — /forgot-password, top to bottom. */
export const FORGOT_CMS_META: ChromeFieldMeta[] = [
  { key: 'auth.forgot.pageTitle', label: 'Browser tab', group: 'Forgot password page', hint: 'Text in the browser tab.' },
  { key: 'auth.logoAlt', label: 'Logo image description', group: 'Left panel', hint: 'For visitors using screen readers.' },
  { key: 'auth.forgot.hero.title', label: 'Headline', group: 'Left panel' },
  { key: 'auth.forgot.hero.lead', label: 'Line under the headline', group: 'Left panel' },
  { key: 'auth.forgot.form.title', label: 'Form title', group: 'The form' },
  { key: 'auth.field.email', label: 'Email', group: 'The form' },
  { key: 'auth.field.emailPlaceholder', label: 'Grey text inside the email box', group: 'The form' },
  { key: 'auth.forgot.submit', label: 'Send reset link button', group: 'The form' },
  { key: 'auth.pleaseWait', label: 'Button text while loading', group: 'The form', hint: 'Replaces the submit label for a moment after they click.' },
  { key: 'auth.backToSignIn', label: 'Back to sign in link', group: 'The form' },
  { key: 'auth.forgot.success.title', label: 'Success heading', group: 'After email is sent' },
  { key: 'auth.forgot.success.body', label: 'Success message', group: 'After email is sent' },
];

/** Reset password page — /reset-password, top to bottom. */
export const RESET_CMS_META: ChromeFieldMeta[] = [
  { key: 'auth.reset.pageTitle', label: 'Browser tab', group: 'Reset password page', hint: 'Text in the browser tab.' },
  { key: 'auth.logoAlt', label: 'Logo image description', group: 'Left panel', hint: 'For visitors using screen readers.' },
  { key: 'auth.reset.hero.title', label: 'Headline', group: 'Left panel' },
  { key: 'auth.reset.hero.lead', label: 'Line under the headline', group: 'Left panel' },
  { key: 'auth.reset.loading', label: 'Loading message', group: 'While the page checks the link' },
  { key: 'auth.reset.invalid.title', label: 'Invalid link heading', group: 'Invalid or missing link' },
  { key: 'auth.reset.invalid.body', label: 'Invalid link message', group: 'Invalid or missing link' },
  { key: 'auth.reset.requestNewLink', label: 'Request a new link', group: 'Invalid or missing link' },
  { key: 'auth.reset.form.title', label: 'Form title', group: 'The form' },
  { key: 'auth.field.password', label: 'New password', group: 'The form' },
  { key: 'auth.password.show', label: 'Show password', group: 'The form' },
  { key: 'auth.password.hide', label: 'Hide password', group: 'The form' },
  { key: 'auth.reset.confirmPassword', label: 'Confirm password', group: 'The form' },
  { key: 'auth.reset.mismatch', label: 'Passwords do not match', group: 'The form', hint: 'Shown under Confirm password when the two boxes differ.' },
  { key: 'auth.reset.submit', label: 'Update password button', group: 'The form' },
  { key: 'auth.pleaseWait', label: 'Button text while loading', group: 'The form', hint: 'Replaces the submit label for a moment after they click.' },
];

/** Sign-in MFA challenge + replace authenticator on /account. */
export const ACCOUNT_MFA_CMS_META: ChromeFieldMeta[] = [
  { key: 'auth.mfa.title', label: 'Two-step verification title', group: 'Sign-in challenge' },
  { key: 'auth.mfa.intro', label: 'Instructions under the title', group: 'Sign-in challenge' },
  { key: 'auth.mfa.verificationCode', label: 'Authenticator code label', group: 'Sign-in challenge' },
  { key: 'auth.mfa.recoveryCode', label: 'Recovery code label', group: 'Sign-in challenge' },
  { key: 'auth.verifyAndContinue', label: 'Verify and continue button', group: 'Sign-in challenge' },
  { key: 'auth.mfa.useRecoveryInstead', label: 'Use a recovery code instead', group: 'Sign-in challenge' },
  { key: 'auth.mfa.useAuthenticatorInstead', label: 'Use authenticator code instead', group: 'Sign-in challenge' },
  { key: 'auth.mfa.recoveryAccepted', label: 'Recovery code accepted notice', group: 'Sign-in challenge', hint: 'Use {remaining} for how many recovery codes are left.' },
  { key: 'auth.pleaseWait', label: 'Button text while loading', group: 'Sign-in challenge' },
  { key: 'auth.account.mfa.title', label: 'Section title', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.enabledIntro', label: 'Intro when MFA is on', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.replace', label: 'Replace authenticator button', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.currentCodeLabel', label: 'Current code from app', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.continue', label: 'Continue button', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.cancel', label: 'Cancel button', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.manualKeyPrefix', label: 'Text before the manual setup key', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.newCodeLabel', label: 'Code from new app', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.confirmNew', label: 'Confirm new authenticator button', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.saveRecovery', label: 'Save your recovery codes notice', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.done', label: 'Done button', group: 'Account — authenticator' },
  { key: 'auth.account.mfa.qrAlt', label: 'QR code image description', group: 'Screen readers (optional)' },
];

const chromeCache: Partial<Record<ChromeDocKey, ChromeBody | null>> = {};
const chromeInflight: Partial<Record<ChromeDocKey, Promise<ChromeBody | null>>> = {};

function fetchChromeDoc(key: ChromeDocKey): Promise<ChromeBody | null> {
  if (chromeInflight[key]) return chromeInflight[key]!;
  if (!chromeInflight[key]) {
    chromeInflight[key] = apiFetch<ChromeDocResponse>(`/api/content/${key}`, { cache: 'no-store' })
      .then((doc) => {
        const body = doc.body;
        if (body && typeof body === 'object' && body.en && body.ar) {
          chromeCache[key] = body;
          return body;
        }
        chromeCache[key] = null;
        return null;
      })
      .catch(() => {
        chromeCache[key] = null;
        return null;
      })
      .finally(() => {
        delete chromeInflight[key];
      });
  }
  return chromeInflight[key]!;
}

export function invalidateSiteChromeCache(key?: ChromeDocKey): void {
  if (key) {
    delete chromeCache[key];
    return;
  }
  for (const k of CHROME_DOC_KEYS) delete chromeCache[k];
}

export function chromeFieldsForKey(key: ChromeDocKey): readonly string[] {
  switch (key) {
    case 'header': return HEADER_LABEL_FIELDS;
    case 'footer': return FOOTER_LABEL_FIELDS;
    case 'auth': return AUTH_LABEL_FIELDS;
    case 'home': return HOME_LABEL_FIELDS;
    case 'browse': return BROWSE_LABEL_FIELDS;
    case 'auctions': return AUCTIONS_LABEL_FIELDS;
    case 'calendar': return CALENDAR_LABEL_FIELDS;
    case 'help': return HELP_LABEL_FIELDS;
    case 'about': return ABOUT_LABEL_FIELDS;
    case 'legal': return LEGAL_LABEL_FIELDS;
    case 'contact': return CONTACT_LABEL_FIELDS;
    case 'categories': return CATEGORIES_LABEL_FIELDS;
    case 'product': return PRODUCT_LABEL_FIELDS;
    case 'lot': return LOT_LABEL_FIELDS;
    case 'account': return ACCOUNT_LABEL_FIELDS;
  }
}

export function pageFieldMeta(fields: readonly string[], group: string): ChromeFieldMeta[] {
  return fields.map((key) => ({
    key,
    group,
    label: humanizeChromeKey(key),
  }));
}

function humanizeChromeKey(key: string): string {
  const last = key.split('.').slice(1).join(' ');
  return last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function useSiteChromeBody(key: ChromeDocKey): ChromeBody | null {
  const [body, setBody] = useState<ChromeBody | null>(() => chromeCache[key] ?? null);

  useEffect(() => {
    let cancelled = false;
    void fetchChromeDoc(key).then((loaded) => {
      if (!cancelled) setBody(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return body;
}

function applyVars(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function chromeTranslate(
  lang: UiLang,
  baseT: (key: MessageKey, vars?: Record<string, string | number>) => string,
  labels: ChromeBody | null,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const override = labels?.[lang]?.[key]?.trim();
  if (override) return applyVars(override, vars);
  return baseT(key, vars);
}

/** CMS overlay for a chrome document (header, footer, auth). */
export function useChromeTranslate(docKey: ChromeDocKey) {
  const { lang, t } = useUiLocale();
  const labels = useSiteChromeBody(docKey);
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => chromeTranslate(lang, t, labels, key, vars),
    [lang, t, labels],
  );
}

/** Empty admin form state for a chrome document. */
export function emptyChromeForm(fields: readonly string[]): ChromeBody {
  const en: ChromeLocaleLabels = {};
  const ar: ChromeLocaleLabels = {};
  for (const field of fields) {
    en[field] = '';
    ar[field] = '';
  }
  return { en, ar };
}

export function mergeChromeForm(existing: ChromeBody | null | undefined, fields: readonly string[]): ChromeBody {
  const blank = emptyChromeForm(fields);
  if (!existing) return blank;
  for (const field of fields) {
    if (existing.en[field] !== undefined) blank.en[field] = existing.en[field] ?? '';
    if (existing.ar[field] !== undefined) blank.ar[field] = existing.ar[field] ?? '';
  }
  return blank;
}

export function defaultLabelPreview(lang: UiLang, key: string): string {
  return translate(lang, key as MessageKey);
}
