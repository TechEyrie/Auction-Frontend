'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import { useChromeTranslate } from '../../lib/siteChrome';
import type { MessageKey } from '../../lib/uiMessages';
import './help.css';

const TOPICS = [
  { id: 'buy', labelKey: 'help.topic.buy' as const, d: 'M3 8h18v12H3z M8 8V5h8v3' },
  { id: 'sell', labelKey: 'help.topic.sell' as const, d: 'M12 5v14 M5 12h14' },
  { id: 'bid', labelKey: 'help.topic.bid' as const, d: 'M14 4l6 6 M11 7l6 6 M12.5 5.5l-6 6 3 3 6-6 M8 13l-5 5 2 2 5-5' },
  { id: 'account', labelKey: 'help.topic.account' as const, d: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21c1-4 4-6 8-6s7 2 8 6' },
  { id: 'pay', labelKey: 'help.topic.pay' as const, d: 'M3 6h18v12H3z M3 10h18 M7 15h4' },
  { id: 'safe', labelKey: 'help.topic.safe' as const, d: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z' },
];

const FAQS: Array<{ t: string; q: MessageKey; a: MessageKey }> = [
  { t: 'buy', q: 'help.faq.0.q', a: 'help.faq.0.a' },
  { t: 'buy', q: 'help.faq.1.q', a: 'help.faq.1.a' },
  { t: 'sell', q: 'help.faq.2.q', a: 'help.faq.2.a' },
  { t: 'sell', q: 'help.faq.3.q', a: 'help.faq.3.a' },
  { t: 'sell', q: 'help.faq.4.q', a: 'help.faq.4.a' },
  { t: 'bid', q: 'help.faq.5.q', a: 'help.faq.5.a' },
  { t: 'bid', q: 'help.faq.6.q', a: 'help.faq.6.a' },
  { t: 'bid', q: 'help.faq.7.q', a: 'help.faq.7.a' },
  { t: 'bid', q: 'help.faq.8.q', a: 'help.faq.8.a' },
  { t: 'bid', q: 'help.faq.9.q', a: 'help.faq.9.a' },
  { t: 'pay', q: 'help.faq.10.q', a: 'help.faq.10.a' },
  { t: 'pay', q: 'help.faq.11.q', a: 'help.faq.11.a' },
  { t: 'account', q: 'help.faq.12.q', a: 'help.faq.12.a' },
  { t: 'account', q: 'help.faq.13.q', a: 'help.faq.13.a' },
  { t: 'safe', q: 'help.faq.14.q', a: 'help.faq.14.a' },
];

const SAFETY: Array<{ t: MessageKey; b: MessageKey }> = [
  { t: 'help.safety.0.t', b: 'help.safety.0.b' },
  { t: 'help.safety.1.t', b: 'help.safety.1.b' },
  { t: 'help.safety.2.t', b: 'help.safety.2.b' },
  { t: 'help.safety.3.t', b: 'help.safety.3.b' },
  { t: 'help.safety.4.t', b: 'help.safety.4.b' },
  { t: 'help.safety.5.t', b: 'help.safety.5.b' },
];

export default function HelpPage() {
  const ct = useChromeTranslate('help');
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({ 5: true });
  const q = query.trim().toLowerCase();
  const active = TOPICS.filter((t) => t.id === topic)[0];
  const list = FAQS.map((f, i) => ({ ...f, i })).filter((f) => {
    if (topic && f.t !== topic) return false;
    if (q && (`${ct(f.q)} ${ct(f.a)}`).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });

  const onQ = (e: { target: { value: string } }) => setQuery(e.target.value);
  const topics = TOPICS.map((t) => {
    const on = topic === t.id;
    return {
      label: ct(t.labelKey),
      d: t.d,
      selected: on,
      border: on ? '#9A6B12' : '#E6E4DF',
      bg: on ? '#FCF8EF' : '#FFFFFF',
      pick: () => setTopic(on ? null : t.id),
    };
  });
  const faqTitle = active ? ct(active.labelKey) : q ? ct('help.searchResults') : ct('help.popularQuestions');
  const filtered = !!(topic || q);
  const none = list.length === 0;
  const clear = () => {
    setTopic(null);
    setQuery('');
  };
  const faqs = list.map((f) => {
    const on = !!open[f.i];
    return {
      q: ct(f.q),
      a: ct(f.a),
      open: on,
      sign: on ? '−' : '+',
      signBg: on ? '#9A6B12' : '#F3F1EC',
      signFg: on ? '#FFFFFF' : '#15191E',
      toggle: () => setOpen((o) => ({ ...o, [f.i]: !o[f.i] })),
    };
  });
  const safety = SAFETY.map((s, i) => ({ n: '0' + (i + 1), t: ct(s.t), b: ct(s.b) }));
  return (
    <div style={css(PAGE_ROOT)}>
      <title>{ct('help.title')}</title>
      <SiteHeader active="help" />

      {/* @generated */}
      <section style={css("background: #FFFFFF; border-bottom: 1px solid #E6E4DF")}>
        <div style={css("max-width: 820px; margin: 0 auto; padding: 56px 24px 48px; text-align: center")}>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4.4vw, 3.2rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>{ct('help.h1')}</h1>
          <p style={css("margin: 10px 0 26px; color: #5B636B; font-size: 18px")}>{ct('help.lead')}</p>
          <div style={css("display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 18px; border: 1px solid #DAD7D0; border-radius: 16px; background: #FFFFFF; box-shadow: 0 18px 40px -28px rgba(21,25,30,.45); text-align: left")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B636B" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4"></path>
            </svg>
            <label htmlFor="hq" className="sr">{ct('help.searchLabel')}</label>
            <input id="hq" type="search" value={q} onChange={onQ} placeholder={ct('help.searchPlaceholder')} style={css("flex: 1; min-width: 0; height: 52px; border: 0; font: inherit; font-size: 17px; background: transparent; outline-offset: 6px")} />
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
            <button type="button" onClick={clear} style={css("height: 40px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; cursor: pointer")}>{ct('help.showAll')}</button>
            </Fragment>
          )}
        </div>
        {none && (
          <Fragment>
          <p style={css("margin: 0; padding: 32px; border: 1px dashed #DAD7D0; border-radius: 16px; text-align: center; color: #5B636B")}>
            {ct('help.emptyPrefix')}
            <Link href="/contact" style={css("font-weight: 600")}>{ct('help.emptyLink')}</Link>
            {ct('help.emptySuffix')}
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
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 30px; letter-spacing: -0.02em; font-weight: 700")}>{ct('help.safetyTitle')}</h2>
          </div>
          <p style={css("margin: 0 0 28px; color: #C9CFCB; max-width: 60ch")}>{ct('help.safetyLead')}</p>
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
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>{ct('help.stillTitle')}</h2>
            <p style={css("margin: 6px 0 0; color: #5B636B")}>{ct('help.stillLead')}</p>
          </div>
          <Link href="/contact" className="btn-primary" style={css("height: 52px; padding: 0 24px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; display: flex; align-items: center")}>{ct('help.contactUs')}</Link>
        </div>
      </section>
{/* @end-generated */}

      <SiteFooter safetyHref="#safety" />
    </div>
  );
}
