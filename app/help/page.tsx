'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import './help.css';

const TOPICS = [
  { id: 'buy', label: 'Buying', d: 'M3 8h18v12H3z M8 8V5h8v3' },
  { id: 'sell', label: 'Selling', d: 'M12 5v14 M5 12h14' },
  { id: 'bid', label: 'Auctions & bidding', d: 'M14 4l6 6 M11 7l6 6 M12.5 5.5l-6 6 3 3 6-6 M8 13l-5 5 2 2 5-5' },
  { id: 'account', label: 'Account', d: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21c1-4 4-6 8-6s7 2 8 6' },
  { id: 'pay', label: 'Payments & fees', d: 'M3 6h18v12H3z M3 10h18 M7 15h4' },
  { id: 'safe', label: 'Safety', d: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z' },
];

const FAQS = [
  { t: 'buy', q: 'How do I contact a seller?', a: 'Use Contact us. There is no in-app chat and seller phone numbers are not published.' },
  { t: 'buy', q: 'Can I return an item I bought?', a: 'Fixed-price sales are agreed directly between buyer and seller, so returns depend on what you agree. Always inspect the item before you pay.' },
  { t: 'sell', q: 'Is posting an ad free?', a: 'Yes, standard ads are free. Optional featured placements help your ad stand out — see [current pricing].' },
  { t: 'sell', q: 'How long does my ad stay live?', a: 'Listing duration is set by the inventory team. This site does not send renewal reminders.' },
  { t: 'sell', q: 'How do I edit or remove my ad?', a: 'Go to My ads, choose the ad, then Edit or Remove. Changes appear straight away.' },
  { t: 'bid', q: 'How does bidding work?', a: 'Each live auction listing shows the server price and the next amount. Confirm a bid and the server accepts or rejects it. The highest accepted bid when the server closes the auction wins. Outbid alerts are not sent.' },
  { t: 'bid', q: 'What is auto-bid?', a: 'Auto-bid is not available. Each bid is the amount you submit.' },
  { t: 'bid', q: 'What is a reserve price?', a: "A hidden minimum set by the seller. If bidding doesn't reach it, the seller doesn't have to sell. Listings show \"Reserve met\" once it's reached." },
  { t: 'bid', q: 'Why did the clock get longer?', a: 'Bids in the final 2 minutes add 2 minutes to the clock. This stops last-second sniping and gives everyone a fair chance to respond.' },
  { t: 'bid', q: 'Can I cancel a bid?', a: "No — bids are binding. That's why we ask you to confirm each one. If you made a genuine mistake, contact us right away." },
  { t: 'pay', q: 'Are there fees when I win an auction?', a: "A buyer's premium of [X]% is added to the winning bid. It's shown on the listing before you bid." },
  { t: 'pay', q: 'How do I pay after I win?', a: "After you win, you'll receive an invoice with payment options. Payment is due within [X] days." },
  { t: 'account', q: 'How do I verify my mobile number?', a: 'When you sign up we text you a code. Enter it to verify. Verified accounts get a badge that buyers and sellers trust.' },
  { t: 'account', q: 'I forgot my password', a: "On the sign-in page, tap Forgot password and enter your email address. We'll send you a reset link (not SMS)." },
  { t: 'safe', q: 'How do I report a suspicious ad?', a: 'Open the ad and tap Report it at the bottom of the page, or contact us directly. Our team reviews every report.' },
];

const SAFETY = [
  { t: 'Meet in public', b: 'Choose a busy, well-lit place for viewings, and bring someone along for high-value deals.' },
  { t: 'Inspect before you pay', b: 'Check the item works and matches the ad. For cars, check the registration and service history.' },
  { t: 'Never pay a stranger upfront', b: "Don't send deposits or transfers to someone you haven't met, however convincing the story." },
  { t: 'Keep chats in the app', b: 'It protects your number and gives us a record if something goes wrong.' },
  { t: 'Watch for pressure', b: 'Prices far below market, urgency and requests to move off the app are common warning signs.' },
  { t: 'Report anything odd', b: "If something feels wrong, report it. You'll help keep the marketplace safe for everyone." },
];

export default function HelpPage() {
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({ 5: true });
  const q = query.trim().toLowerCase();
  const active = TOPICS.filter((t) => t.id === topic)[0];
  const list = FAQS.map((f, i) => ({ ...f, i })).filter((f) => {
    if (topic && f.t !== topic) return false;
    if (q && (f.q + ' ' + f.a).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  const onQ = (e: { target: { value: string } }) => setQuery(e.target.value);
  const topics = TOPICS.map((t) => {
    const on = topic === t.id;
    return {
      label: t.label,
      d: t.d,
      selected: on,
      border: on ? '#9A6B12' : '#E6E4DF',
      bg: on ? '#FCF8EF' : '#FFFFFF',
      pick: () => setTopic(on ? null : t.id),
    };
  });
  const faqTitle = active ? active.label : q ? 'Search results' : 'Popular questions';
  const filtered = !!(topic || q);
  const none = list.length === 0;
  const clear = () => {
    setTopic(null);
    setQuery('');
  };
  const faqs = list.map((f) => {
    const on = !!open[f.i];
    return {
      q: f.q,
      a: f.a,
      open: on,
      sign: on ? '−' : '+',
      signBg: on ? '#9A6B12' : '#F3F1EC',
      signFg: on ? '#FFFFFF' : '#15191E',
      toggle: () => setOpen((o) => ({ ...o, [f.i]: !o[f.i] })),
    };
  });
  const safety = SAFETY.map((s, i) => ({ n: '0' + (i + 1), t: s.t, b: s.b }));
  return (
    <div style={css(PAGE_ROOT)}>
      <title>Help centre — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="help" />

      {/* @generated */}
      <section style={css("background: #FFFFFF; border-bottom: 1px solid #E6E4DF")}>
        <div style={css("max-width: 820px; margin: 0 auto; padding: 56px 24px 48px; text-align: center")}>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4.4vw, 3.2rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>How can we help?</h1>
          <p style={css("margin: 10px 0 26px; color: #5B636B; font-size: 18px")}>Answers about buying, selling and bidding.</p>
          <div style={css("display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 18px; border: 1px solid #DAD7D0; border-radius: 16px; background: #FFFFFF; box-shadow: 0 18px 40px -28px rgba(21,25,30,.45); text-align: left")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B636B" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
            </svg>
            <label htmlFor="hq" className="sr">Search help</label>
            <input id="hq" type="search" value={q} onChange={onQ} placeholder="e.g. how does bidding work" style={css("flex: 1; min-width: 0; height: 52px; border: 0; font: inherit; font-size: 17px; background: transparent; outline-offset: 6px")} />
          </div>
        </div>
      </section>
      <section style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 48px var(--mkt-gutter-x) 0")}>
        <div style={css("display: flex; flex-wrap: wrap; justify-content: center; gap: 12px")}>
          {topics.map((t, i) => (
            <Fragment key={i}>
            <button type="button" className="topic" onClick={t.pick} aria-pressed={t.selected} style={css(`width: 180px; max-width: 100%; min-height: 112px; padding: 18px; border-radius: 16px; font: inherit; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 12px; border: 1.5px solid ${t.border}; background: ${t.bg}; transition: border-color .15s`)}>
              <span style={css("width: 42px; height: 42px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.d}></path>
                </svg>
              </span>
              <span style={css("font-weight: 600; color: #15191E")}>{t.label}</span>
            </button>
            </Fragment>
          ))}
        </div>
      </section>
      <section style={css("max-width: 880px; margin: 0 auto; padding: 48px 24px 0")}>
        <div style={css("display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 16px; flex-wrap: wrap")}>
          <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px; letter-spacing: -0.02em; font-weight: 700")}>{faqTitle}</h2>
          {filtered && (
            <Fragment>
            <button type="button" onClick={clear} style={css("height: 40px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; cursor: pointer")}>Show all questions</button>
            </Fragment>
          )}
        </div>
        {none && (
          <Fragment>
          <p style={css("margin: 0; padding: 32px; border: 1px dashed #DAD7D0; border-radius: 16px; text-align: center; color: #5B636B")}>
            {"No answers match yet. "}
            <Link href="/contact" style={css("font-weight: 600")}>Ask our team</Link>
            {" instead."}
          </p>
          </Fragment>
        )}
        <div style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; overflow: hidden")}>
          {faqs.map((f, i) => (
            <Fragment key={i}>
            <div style={css("border-bottom: 1px solid #EEECE7")}>
              <h3 style={css("margin: 0")}>
                <button type="button" onClick={f.toggle} aria-expanded={f.open} style={css("width: 100%; min-height: 64px; padding: 16px 22px; border: 0; background: transparent; font: inherit; font-size: 17px; font-weight: 600; color: #15191E; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; text-align: left")}>
                  <span>{f.q}</span>
                  <span aria-hidden="true" style={css(`flex: 0 0 28px; height: 28px; border-radius: 50%; background: ${f.signBg}; color: ${f.signFg}; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1`)}>{f.sign}</span>
                </button>
              </h3>
              {f.open && (
                <Fragment>
                <p style={css("margin: 0; padding: 0 22px 20px; color: #2A3036; max-width: 70ch")}>{f.a}</p>
                </Fragment>
              )}
            </div>
            </Fragment>
          ))}
        </div>
      </section>
      <section id="safety" style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 72px var(--mkt-gutter-x) 0")}>
        <div style={css("background: #15191E; color: #FFFFFF; border-radius: 24px; padding: clamp(28px, 4vw, 48px)")}>
          <div style={css("display: flex; gap: 14px; align-items: center; margin-bottom: 8px")}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4A84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4"></path>
            </svg>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 30px; letter-spacing: -0.02em; font-weight: 700")}>Safety tips</h2>
          </div>
          <p style={css("margin: 0 0 28px; color: #C9CFCB; max-width: 60ch")}>Most deals go smoothly. These habits keep it that way.</p>
          <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px")}>
            {safety.map((s, i) => (
              <Fragment key={i}>
              <div style={css("background: #211E19; border: 1px solid #2F2A23; border-radius: 16px; padding: 20px")}>
                <span style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: #D4A84B")}>{s.n}</span>
                <h3 style={css("margin: 6px 0 6px; font-size: 17px; font-weight: 600")}>{s.t}</h3>
                <p style={css("margin: 0; color: #C9CFCB; font-size: 15px")}>{s.b}</p>
              </div>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <section style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 48px var(--mkt-gutter-x) 80px")}>
        <div style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 24px; padding: clamp(24px, 4vw, 40px); display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: space-between")}>
          <div>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Still need help?</h2>
            <p style={css("margin: 6px 0 0; color: #5B636B")}>Our team usually replies within one working day.</p>
          </div>
          <Link href="/contact" className="btn-primary" style={css("height: 52px; padding: 0 24px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; display: flex; align-items: center")}>Contact us</Link>
        </div>
      </section>
{/* @end-generated */}

      <SiteFooter safetyHref="#safety" />
    </div>
  );
}
