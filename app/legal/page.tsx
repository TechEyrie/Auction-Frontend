'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import { useChromeTranslate } from '../../lib/siteChrome';
import type { MessageKey } from '../../lib/uiMessages';
import './legal.css';

const TERMS_SECTIONS: Array<[MessageKey, MessageKey]> = [
  ['legal.terms.0.h', 'legal.terms.0.b'],
  ['legal.terms.1.h', 'legal.terms.1.b'],
  ['legal.terms.2.h', 'legal.terms.2.b'],
  ['legal.terms.3.h', 'legal.terms.3.b'],
  ['legal.terms.4.h', 'legal.terms.4.b'],
  ['legal.terms.5.h', 'legal.terms.5.b'],
  ['legal.terms.6.h', 'legal.terms.6.b'],
  ['legal.terms.7.h', 'legal.terms.7.b'],
];

const PRIVACY_SECTIONS: Array<[MessageKey, MessageKey]> = [
  ['legal.privacy.0.h', 'legal.privacy.0.b'],
  ['legal.privacy.1.h', 'legal.privacy.1.b'],
  ['legal.privacy.2.h', 'legal.privacy.2.b'],
  ['legal.privacy.3.h', 'legal.privacy.3.b'],
  ['legal.privacy.4.h', 'legal.privacy.4.b'],
  ['legal.privacy.5.h', 'legal.privacy.5.b'],
  ['legal.privacy.6.h', 'legal.privacy.6.b'],
  ['legal.privacy.7.h', 'legal.privacy.7.b'],
];

export default function LegalPage() {
  const ct = useChromeTranslate('legal');
  const [doc, setDoc] = useState('terms');
  const data = doc === 'privacy'
    ? { title: ct('legal.privacyTitle'), sections: PRIVACY_SECTIONS.map(([h, b]) => [ct(h), ct(b)] as [string, string]) }
    : { title: ct('legal.termsTitle'), sections: TERMS_SECTIONS.map(([h, b]) => [ct(h), ct(b)] as [string, string]) };
  const tabs = [
    { id: 'terms', label: ct('legal.tab.terms') },
    { id: 'privacy', label: ct('legal.tab.privacy') },
  ].map((t) => {
    const on = doc === t.id;
    return {
      label: t.label,
      selected: on,
      fg: on ? 'var(--mkt-text)' : 'var(--mkt-muted)',
      line: on ? 'var(--mkt-gold)' : 'transparent',
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
      <title>{ct('legal.title')}</title>
      <SiteHeader />

      {/* @generated */}
      <section className="page-hero">
        <div className="page-hero__inner" style={css("padding-bottom: 0")}>
          <nav aria-label="Breadcrumb" style={css("font-size: 14px; color: var(--mkt-muted); margin-bottom: 10px")}>
            <Link href="/">Home</Link>
            {' '}
            <span aria-hidden="true">/</span>
            {` ${ct('legal.breadcrumb')}`}
          </nav>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4vw, 3rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>{docTitle}</h1>
          <p style={css("margin: 8px 0 24px; color: var(--mkt-muted)")}>{ct('legal.updated')}</p>
          <div role="tablist" aria-label={ct('legal.tablistAria')} style={css("display: flex; gap: 4px")}>
            {tabs.map((t, i) => (
              <Fragment key={i}>
              <button type="button" role="tab" aria-selected={t.selected} onClick={t.pick} style={css(`height: 52px; padding: 0 18px; border: 0; background: transparent; font: inherit; font-weight: 600; font-size: 16px; cursor: pointer; color: ${t.fg}; box-shadow: inset 0 -3px 0 ${t.line}`)}>{t.label}</button>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <div className="page-shell legal-body" style={css("padding-top: 40px; padding-bottom: 80px")}>
        <nav aria-label="On this page" style={css("min-width: 0; background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 18px; padding: 20px")}>
          <div style={css("font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--mkt-muted); margin-bottom: 10px")}>{ct('legal.toc')}</div>
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
        <article className="legal-article" style={css("display: flex; flex-direction: column; gap: 32px")}>
          {sections.map((s, i) => (
            <Fragment key={i}>
            <section id={s.id}>
              <h2 style={css("margin: 0 0 10px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 22px; font-weight: 700")}>
                <span style={css("color: var(--mkt-gold)")}>{s.n}.</span>
                {' '}{s.h}
              </h2>
              <p style={css("margin: 0; color: var(--mkt-text-2); font-size: 17px; line-height: 1.65")}>{s.b}</p>
            </section>
            </Fragment>
          ))}
          <div style={css("padding: 20px; border-radius: 16px; background: var(--mkt-gold-soft); color: var(--mkt-text-2)")}>
            {ct('legal.questionsPrefix')}
            <Link href="/contact" style={css("font-weight: 700; color: var(--mkt-gold-deep)")}>{ct('legal.questionsLink')}</Link>
            .
          </div>
        </article>
      </div>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
