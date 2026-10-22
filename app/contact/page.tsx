'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState, type FormEvent } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch, ApiRequestError } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useSession } from '../../lib/session';
import { useChromeTranslate } from '../../lib/siteChrome';
import type { MessageKey } from '../../lib/uiMessages';
import {
  CONTACT_EMAIL,
  mailtoHref,
  OFFICE_ADDRESS,
  PHONE_DISPLAY,
  telHref,
  whatsappChatUrl,
} from '../../lib/siteContact';
import './contact.css';

const LISTING_REF_RE = /^l_[A-Za-z0-9_-]{6,32}$/;

const SUBJECTS: Array<{ value: string; key: MessageKey }> = [
  { value: 'A listing or seller', key: 'contact.subject.0' },
  { value: 'Bidding or an auction I won', key: 'contact.subject.1' },
  { value: 'Selling at auction', key: 'contact.subject.2' },
  { value: 'Business auctions (fleet, equipment, estate)', key: 'contact.subject.3' },
  { value: 'My account', key: 'contact.subject.4' },
  { value: 'Report a problem', key: 'contact.subject.5' },
  { value: 'Careers', key: 'contact.subject.6' },
  { value: 'Something else', key: 'contact.subject.7' },
];

const CHANNELS: Array<{ k: MessageKey; v?: string; hours?: boolean; d: string; href?: string }> = [
  {
    k: 'contact.channel.phone',
    v: PHONE_DISPLAY,
    href: telHref(),
    d: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  },
  {
    k: 'contact.channel.whatsapp',
    v: PHONE_DISPLAY,
    href: whatsappChatUrl(),
    d: 'M4 5h16v11H8l-4 4z M8 10h8',
  },
  {
    k: 'contact.channel.email',
    v: CONTACT_EMAIL,
    href: mailtoHref(),
    d: 'M3 6h18v12H3z M3 7l9 6 9-6',
  },
  {
    k: 'contact.channel.office',
    v: OFFICE_ADDRESS,
    d: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z M12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  },
  {
    k: 'contact.channel.hours',
    hours: true,
    d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2',
  },
];

function describeError(err: unknown): { message: string; fields: Record<string, string> } {
  if (err instanceof ApiRequestError) {
    return { message: err.body.message, fields: err.body.fieldErrors ?? {} };
  }
  return { message: 'We could not reach the server. Please try again.', fields: {} };
}

export default function ContactPage() {
  const ct = useChromeTranslate('contact');
  const session = useSession();
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [about, setAbout] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && LISTING_REF_RE.test(ref)) {
      setAbout(ref);
      setMessage((current) => (current ? current : `Hello, I would like to know more about listing ${ref}.`));
    }
  }, []);

  useEffect(() => {
    if (session.status !== 'authenticated' || !session.user) return;
    if (session.user.fullName) {
      setName((current) => (current ? current : session.user!.fullName));
    }
    if (session.user.email) {
      setEmail((current) => (current ? current : session.user!.email!));
    }
  }, [session.status, session.user]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    setError(null);
    setFieldErrors({});
    setBusy(true);
    try {
      const trimmedMessage = message.trim();
      const phone = String(data.get('phone') ?? '').trim();
      let storedMessage = trimmedMessage;
      if (phone) {
        storedMessage = `${storedMessage}\n\nPhone: ${phone}`;
      }
      const listingRef = about.trim();
      const listingReference = LISTING_REF_RE.test(listingRef) ? listingRef : undefined;
      const payload: Record<string, string> = {
        name: String(data.get('name') ?? name).trim(),
        email: String(data.get('email') ?? email).trim(),
        subject: String(data.get('subject') ?? '').trim(),
        message: storedMessage,
        website: String(data.get('website') ?? ''),
      };
      if (listingReference) {
        payload.listingReference = listingReference;
      }
      const result = await apiFetch<{ reference: string }>('/api/enquiries', {
        method: 'POST',
        headers: await session.ensureCsrfHeaders(),
        json: payload,
      });
      setSent(result.reference);
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fields);
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setSent(null);
    setError(null);
    setFieldErrors({});
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <div role="alert" style={css('font-size: 13px; color: #8A3B05; margin-top: 6px')}>{fieldErrors[key]}</div>
    ) : null;

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{ct('contact.title')}</title>
      <SiteHeader active="sell" />


      {/* @generated */}
      <section className="page-shell" style={css("padding-top: 48px; padding-bottom: 0")}>
        <nav aria-label="Breadcrumb" style={css("font-size: 14px; color: var(--mkt-muted); margin-bottom: 10px")}>
          <Link href="/">Home</Link>
          {' '}
          <span aria-hidden="true">/</span>
          {` ${ct('contact.breadcrumb')}`}
        </nav>
        <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4.4vw, 3.2rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>{ct('contact.h1')}</h1>
        <p style={css("margin: 10px 0 0; color: var(--mkt-muted); font-size: 18px; max-width: 56ch")}>
          {ct('contact.leadPrefix')}
          <Link href="/help" style={css("font-weight: 600")}>{ct('contact.leadLink')}</Link>
          .
        </p>
      </section>
      <div className="contact-layout">
        <section className="contact-panel">
          {sent ? (
            <div className="contact-success" role="status">
              <span className="contact-success__icon" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h2>{ct('contact.successTitle')}</h2>
              <p>{ct('contact.successBody')}</p>
              <div className="contact-success__ref">{ct('contact.successRef', { ref: sent })}</div>
              <div className="contact-success__actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={again}
                  style={css('height: 48px; padding: 0 22px; border: 0; border-radius: 12px; background: var(--mkt-gold); color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}
                >
                  {ct('contact.sendAnother')}
                </button>
                <Link
                  href="/"
                  className="ghost-btn btn-ghost"
                >
                  {ct('contact.backHome')}
                </Link>
              </div>
            </div>
          ) : null}
          {error ? <p role="alert" style={css('color: #8A3B05; margin: 0 0 12px')}>{error}</p> : null}
          {!sent && (
            <Fragment>
            <form onSubmit={onSubmit} style={css("display: flex; flex-direction: column; gap: 18px")}>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>{ct('contact.formTitle')}</h2>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={css('position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden')}
                defaultValue=""
              />
              <div style={css("display: flex; flex-wrap: wrap; gap: 18px")}>
                <div style={css("flex: 1 1 240px")}>
                  <label htmlFor="cn" className="lbl">{ct('contact.name')}</label>
                  <input
                    id="cn"
                    name="name"
                    className="field"
                    autoComplete="name"
                    required={true}
                    minLength={2}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={fieldErrors.name ? true : undefined}
                  />
                  {fieldError('name')}
                </div>
                <div style={css("flex: 1 1 240px")}>
                  <label htmlFor="cp" className="lbl">{ct('contact.phone')}</label>
                  <input id="cp" name="phone" className="field" type="tel" autoComplete="tel" placeholder="+974" />
                </div>
              </div>
              <div>
                <label htmlFor="ce" className="lbl">{ct('contact.email')}</label>
                <input
                  id="ce"
                  name="email"
                  className="field"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                />
                {fieldError('email')}
              </div>
              <div>
                <label htmlFor="cref" className="lbl">{ct('contact.listingRef')}</label>
                <input
                  id="cref"
                  name="listingReference"
                  className="field"
                  value={about}
                  onChange={(event) => setAbout(event.target.value)}
                  placeholder={ct('contact.listingPlaceholder')}
                  aria-invalid={fieldErrors.listingReference ? true : undefined}
                />
                {fieldError('listingReference')}
              </div>
              <div>
                <label htmlFor="ct" className="lbl">{ct('contact.subject')}</label>
                <select
                  id="ct"
                  name="subject"
                  className="field"
                  style={css("cursor: pointer")}
                  aria-invalid={fieldErrors.subject ? true : undefined}
                  defaultValue="A listing or seller"
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject.value} value={subject.value}>{ct(subject.key)}</option>
                  ))}
                </select>
                {fieldError('subject')}
              </div>
              <div>
                <label htmlFor="cm" className="lbl">{ct('contact.message')}</label>
                <textarea
                  id="cm"
                  name="message"
                  className="field"
                  rows={6}
                  required={true}
                  minLength={10}
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-invalid={fieldErrors.message ? true : undefined}
                ></textarea>
                <p style={css('margin: 6px 0 0; font-size: 13px; color: var(--mkt-muted)')}>{ct('contact.messageHint')}</p>
                {fieldError('message')}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                style={css(`align-self: flex-start; height: 54px; padding: 0 30px; border: 0; border-radius: 12px; background: var(--mkt-gold); color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: ${busy ? 'wait' : 'pointer'}; opacity: ${busy ? 0.7 : 1}`)}
              >
                {busy ? ct('contact.sending') : ct('contact.submit')}
              </button>
            </form>
            </Fragment>
          )}
        </section>
        <aside style={css("display: flex; flex-direction: column; gap: 14px")}>
          {CHANNELS.map((c, i) => (
            <Fragment key={i}>
            <div style={css("background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 18px; padding: 18px 20px; display: flex; gap: 14px; align-items: center")}>
              <span style={css("flex: 0 0 46px; height: 46px; border-radius: 12px; background: var(--mkt-gold-soft); display: flex; align-items: center; justify-content: center")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mkt-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.d}></path>
                </svg>
              </span>
              <div style={css("min-width: 0")}>
                <div style={css("font-size: 13px; color: var(--mkt-muted); text-transform: uppercase; letter-spacing: .06em")}>{ct(c.k)}</div>
                {c.href ? (
                  <a
                    href={c.href}
                    style={css("font-weight: 600; color: var(--mkt-text); word-break: break-word")}
                    {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {c.v}
                  </a>
                ) : (
                  <div style={css("font-weight: 600")}>{c.hours ? ct('contact.hoursValue') : c.v}</div>
                )}
              </div>
            </div>
            </Fragment>
          ))}
          <div style={css('border-radius: 18px; overflow: hidden; border: 1px solid var(--mkt-border); background: var(--mkt-surface-2)')}>
            <iframe
              title="Map of Doha, Qatar"
              src="https://www.google.com/maps?q=Doha,+Qatar&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={css('display: block; width: 100%; height: 220px; border: 0')}
            />
            <p style={css('margin: 0; padding: 10px 14px; font-size: 14px; font-weight: 600; color: var(--mkt-text-2); text-align: center; background: var(--mkt-surface)')}>
              {OFFICE_ADDRESS}
            </p>
          </div>
        </aside>
      </div>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
