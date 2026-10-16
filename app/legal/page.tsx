'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import './legal.css';

const DOCS: Record<string, { title: string; sections: [string, string][] }> = {
  terms: { title: 'Terms of use', sections: [
    ['Who we are', 'This website is operated by [Company legal name], registered in Qatar under commercial registration [CR number]. By using the site you agree to these terms.'],
    ['Your account', 'You must be 18 or over and give accurate details. Keep your password private — you are responsible for activity on your account.'],
    ['Posting ads', 'Only list items you own or are authorised to sell. Descriptions and photos must be accurate. Prohibited and illegal items are not allowed, and we may remove any ad that breaks these rules.'],
    ['Buying at a fixed price', 'Fixed-price sales are agreed directly between buyer and seller. We are not a party to the sale, so always inspect items before paying.'],
    ['Bidding at auction', "Every bid is a binding offer to buy. If you win, you must complete the purchase at your final bid plus the buyer's premium shown on the listing. Bids in the final 2 minutes extend the auction by 2 minutes."],
    ['Fees and payment', "Standard ads are free. Auction fees, the buyer's premium and payment deadlines are shown before you bid or list. Payment for auction wins is due within [X] days."],
    ['Our responsibility', "We work hard to keep the marketplace safe, but we can't guarantee every listing. To the extent the law allows, we aren't liable for losses arising from deals between users."],
    ['Changes and contact', 'We may update these terms and will show the date of the latest change at the top. Questions? Contact us any time.'],
  ] },
  privacy: { title: 'Privacy policy', sections: [
    ['What we collect', 'Your name, mobile number, email (if given), the ads you post, your bids, and messages sent through the site. We also collect basic device and usage data to keep the service running.'],
    ['How we use it', "To run your account, show your ads, process bids and payments, prevent fraud, and send you alerts you've asked for — such as outbid notices."],
    ['What others can see', 'Buyers see your ad, your first name and your seller rating. Your mobile number is only shown when you choose to reveal it. Bidders appear by an anonymous bidder number.'],
    ['Who we share it with', 'Payment providers, SMS and email services, and authorities where the law requires. We never sell your personal data.'],
    ['How long we keep it', 'For as long as your account is open, then for [X] years where needed for legal or accounting reasons.'],
    ['Your choices', 'You can view, update or delete your details from your account, and turn off marketing messages at any time.'],
    ['Cookies', 'We use essential cookies to keep you signed in, and optional analytics cookies that you can switch off.'],
    ['Contact', 'For privacy questions or requests, contact [privacy@yourdomain.com].'],
  ] },
};

export default function LegalPage() {
  const [doc, setDoc] = useState('terms');
  const data = DOCS[doc];
  const tabs = [
    { id: 'terms', label: 'Terms of use' },
    { id: 'privacy', label: 'Privacy policy' },
  ].map((t) => {
    const on = doc === t.id;
    return {
      label: t.label,
      selected: on,
      fg: on ? '#15191E' : '#5B636B',
      line: on ? '#9A6B12' : 'transparent',
      pick: () => setDoc(t.id),
    };
  });
  const docTitle = data.title;
  const sections = data.sections.map((s, i) => {
    const id = doc + '-' + (i + 1);
    return { n: i + 1, id, href: '#' + id, h: s[0], b: s[1] };
  });
  return (
    <div style={css(PAGE_ROOT)}>
      <title>Terms &amp; privacy — Araq &amp; Kahraman Auctions</title>
      <SiteHeader />

      {/* @generated */}
      <section style={css("background: #FFFFFF; border-bottom: 1px solid #E6E4DF")}>
        <div style={css("max-width: 1240px; margin: 0 auto; padding: 44px 24px 0")}>
          <nav aria-label="Breadcrumb" style={css("font-size: 14px; color: #5B636B; margin-bottom: 10px")}>
            <Link href="/">Home</Link>
            {' '}
            <span aria-hidden="true">/</span>
            {" Legal"}
          </nav>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4vw, 3rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>{docTitle}</h1>
          <p style={css("margin: 8px 0 24px; color: #5B636B")}>Last updated [date] · Written in plain language</p>
          <div role="tablist" aria-label="Document" style={css("display: flex; gap: 4px")}>
            {tabs.map((t, i) => (
              <Fragment key={i}>
              <button type="button" role="tab" aria-selected={t.selected} onClick={t.pick} style={css(`height: 52px; padding: 0 18px; border: 0; background: transparent; font: inherit; font-weight: 600; font-size: 16px; cursor: pointer; color: ${t.fg}; box-shadow: inset 0 -3px 0 ${t.line}`)}>{t.label}</button>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <div style={css("max-width: 1240px; margin: 0 auto; padding: 40px 24px 80px; display: flex; flex-wrap: wrap; gap: 40px; align-items: flex-start")}>
        <nav aria-label="On this page" style={css("flex: 1 1 240px; min-width: 0; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; padding: 20px")}>
          <div style={css("font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5B636B; margin-bottom: 10px")}>On this page</div>
          <ol style={css("margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 15px")}>
            {sections.map((s, i) => (
              <Fragment key={i}>
              <li>
                <a className="toc" href={s.href}>{s.h}</a>
              </li>
              </Fragment>
            ))}
          </ol>
        </nav>
        <article style={css("flex: 999 1 560px; min-width: 0; max-width: 760px; display: flex; flex-direction: column; gap: 32px")}>
          {sections.map((s, i) => (
            <Fragment key={i}>
            <section id={s.id}>
              <h2 style={css("margin: 0 0 10px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px; font-weight: 700")}>
                <span style={css("color: #9A6B12")}>{s.n}.</span>
                {' '}{s.h}
              </h2>
              <p style={css("margin: 0; color: #2A3036; font-size: 17px; line-height: 1.65")}>{s.b}</p>
            </section>
            </Fragment>
          ))}
          <div style={css("padding: 20px; border-radius: 16px; background: #F6EEDC; color: #3D3420")}>
            {"Questions about this page? "}
            <Link href="/contact" style={css("font-weight: 700; color: #7D5610")}>Contact us</Link>
            .
          </div>
        </article>
      </div>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
