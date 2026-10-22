'use client';

import Link from 'next/link';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { css, PAGE_ROOT } from '../../lib/css';
import { useChromeTranslate } from '../../lib/siteChrome';
import { CONTACT_EMAIL } from '../../lib/siteContact';
import './about.css';

export default function AboutPage() {
  const ct = useChromeTranslate('about');
  return (
    <div style={css(PAGE_ROOT)}>
      <title>{ct('about.title')}</title>
      <SiteHeader />

      {/* @generated */}
      <section className="page-hero">
        <div className="page-hero__inner" style={css("padding: 64px var(--mkt-gutter-x); display: flex; flex-wrap: wrap; gap: 48px; align-items: center")}>
          <div style={css("flex: 999 1 520px; min-width: 0")}>
            <p style={css("margin: 0 0 16px; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mkt-gold)")}>{ct('about.kicker')}</p>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.4rem, 4.6vw, 3.8rem); letter-spacing: -0.035em; font-weight: 700; line-height: 1.05; max-width: 16ch")}>{ct('about.h1')}</h1>
            <p style={css("margin: 22px 0 0; font-size: 19px; color: var(--mkt-muted); max-width: 52ch")}>{ct('about.lead')}</p>
          </div>
          <div style={css("flex: 1 1 300px; display: flex; justify-content: center")}>
            <div style={css("width: min(340px, 100%); aspect-ratio: 1; border-radius: 50%; background: var(--mkt-gold-soft); display: flex; align-items: center; justify-content: center")}>
              <img src="/logo.png" alt={ct('about.logoAlt')} width="280" height="280" style={css("width: 82%; height: auto; display: block")} />
            </div>
          </div>
        </div>
      </section>
      <section className="page-shell about-story" style={css("padding-top: 72px; padding-bottom: 0")}>
        <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700; line-height: 1.15")}>{ct('about.storyTitle')}</h2>
        <div style={css("min-width: 0; display: flex; flex-direction: column; gap: 16px; font-size: 18px; color: var(--mkt-text-2)")}>
          <p style={css("margin: 0")}>{ct('about.story1')}</p>
          <p style={css("margin: 0")}>{ct('about.story2')}</p>
        </div>
      </section>
      <section className="page-shell" style={css("padding-top: 72px; padding-bottom: 0")}>
        <h2 style={css("margin: 0 0 24px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700")}>{ct('about.offerTitle')}</h2>
        <div className="about-offer-grid">
          <article style={css("background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: var(--mkt-gold-soft); display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8h18v12H3z M8 8V5h8v3"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>{ct('about.offer1Title')}</h3>
            <p style={css("margin: 0 0 14px; color: var(--mkt-muted)")}>{ct('about.offer1Body')}</p>
            <Link href="/browse" style={css("font-weight: 600")}>{ct('about.offer1Link')}</Link>
          </article>
          <article style={css("background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: var(--mkt-gold-soft); display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4l6 6 M11 7l6 6 M12.5 5.5l-6 6 3 3 6-6 M8 13l-5 5 2 2 5-5"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>{ct('about.offer2Title')}</h3>
            <p style={css("margin: 0 0 14px; color: var(--mkt-muted)")}>{ct('about.offer2Body')}</p>
            <Link href="/auctions" style={css("font-weight: 600")}>{ct('about.offer2Link')}</Link>
          </article>
          <article style={css("background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 20px; padding: 26px")}>
            <span style={css("width: 48px; height: 48px; border-radius: 12px; background: var(--mkt-gold-soft); display: flex; align-items: center; justify-content: center")}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6"></path>
              </svg>
            </span>
            <h3 style={css("margin: 18px 0 8px; font-size: 20px; font-weight: 700")}>{ct('about.offer3Title')}</h3>
            <p style={css("margin: 0 0 14px; color: var(--mkt-muted)")}>{ct('about.offer3Body')}</p>
            <Link href="/contact" style={css("font-weight: 600")}>{ct('about.offer3Link')}</Link>
          </article>
        </div>
      </section>
      <section className="page-shell" style={css("padding-top: 72px; padding-bottom: 0")}>
        <div style={css("background: var(--mkt-hero-feature); color: var(--mkt-hero-feature-fg); border-radius: 24px; padding: clamp(28px, 4vw, 52px)")}>
          <h2 style={css("margin: 0 0 28px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 34px; letter-spacing: -0.02em; font-weight: 700")}>{ct('about.valuesTitle')}</h2>
          <div style={css("display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 28px")}>
            <div>
              <div style={css("height: 3px; width: 40px; background: var(--mkt-gold); margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>{ct('about.value1Title')}</h3>
              <p style={css("margin: 0; color: var(--mkt-hero-feature-muted)")}>{ct('about.value1Body')}</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: var(--mkt-gold); margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>{ct('about.value2Title')}</h3>
              <p style={css("margin: 0; color: var(--mkt-hero-feature-muted)")}>{ct('about.value2Body')}</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: var(--mkt-gold); margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>{ct('about.value3Title')}</h3>
              <p style={css("margin: 0; color: var(--mkt-hero-feature-muted)")}>{ct('about.value3Body')}</p>
            </div>
            <div>
              <div style={css("height: 3px; width: 40px; background: var(--mkt-gold); margin-bottom: 14px")}></div>
              <h3 style={css("margin: 0 0 6px; font-size: 19px; font-weight: 600")}>{ct('about.value4Title')}</h3>
              <p style={css("margin: 0; color: var(--mkt-hero-feature-muted)")}>{ct('about.value4Body')}</p>
            </div>
          </div>
        </div>
      </section>
      <section id="careers" className="page-shell" style={css("padding-top: 72px; padding-bottom: 80px")}>
        <div style={css("background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 24px; padding: clamp(28px, 4vw, 48px); display: flex; flex-wrap: wrap; gap: 32px; align-items: center; justify-content: space-between")}>
          <div style={css("flex: 1 1 460px; min-width: 0")}>
            <p style={css("margin: 0 0 10px; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--mkt-gold)")}>{ct('about.careersKicker')}</p>
            <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 32px; letter-spacing: -0.02em; font-weight: 700")}>{ct('about.careersTitle')}</h2>
            <p style={css("margin: 10px 0 0; color: var(--mkt-muted); font-size: 17px; max-width: 54ch")}>{ct('about.careersBody')}</p>
            <p style={css("margin: 14px 0 0; font-size: 16px")}>
              {ct('about.careersSend')}
              <a href={`mailto:${CONTACT_EMAIL}`} style={css("font-weight: 700; color: var(--mkt-gold)")}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <Link href="/contact" className="btn-primary" style={css("height: 52px; padding: 0 24px; border-radius: 12px; background: var(--mkt-gold); color: #FFFFFF; font-weight: 700; display: flex; align-items: center")}>{ct('about.getInTouch')}</Link>
        </div>
      </section>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
