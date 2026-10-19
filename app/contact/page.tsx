'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useSession } from '../../lib/session';
import {
  CONTACT_EMAIL,
  mailtoHref,
  OFFICE_ADDRESS,
  PHONE_DISPLAY,
  telHref,
  whatsappChatUrl,
} from '../../lib/siteContact';
import './contact.css';

const CHANNELS: Array<{ k: string; v: string; d: string; href?: string }> = [
  {
    k: 'Phone',
    v: PHONE_DISPLAY,
    href: telHref(),
    d: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  },
  {
    k: 'WhatsApp',
    v: PHONE_DISPLAY,
    href: whatsappChatUrl(),
    d: 'M4 5h16v11H8l-4 4z M8 10h8',
  },
  {
    k: 'Email',
    v: CONTACT_EMAIL,
    href: mailtoHref(),
    d: 'M3 6h18v12H3z M3 7l9 6 9-6',
  },
  {
    k: 'Office',
    v: OFFICE_ADDRESS,
    d: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z M12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4z',
  },
  {
    k: 'Opening hours',
    v: 'Sat–Thu, 9 AM – 6 PM',
    d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2',
  },
];

export default function ContactPage() {
  const session = useSession();
  /**
   * There is no enquiry endpoint yet, so this form must not claim to have sent anything. Submitting
   * records the attempt in local state and says plainly that nothing was transmitted or stored.
   */
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState('');
  const [message, setMessage] = useState('');

  // A link from a listing carries its reference, so the enquiry starts with the right context.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^l_[A-Za-z0-9_-]{6,32}$/.test(ref)) {
      setAbout(ref);
      setMessage((current) => (current ? current : `Hello, I would like to know more about listing ${ref}.`));
    }
  }, []);

  const submit = async (e: { preventDefault?: () => void; currentTarget?: HTMLFormElement }) => {
    if (e && e.preventDefault) e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl) return;
    const data = new FormData(formEl);
    setError(null);
    try {
      const result = await apiFetch<{ reference: string }>('/api/enquiries', {
        method: 'POST',
        headers: session.authHeaders(),
        json: {
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          subject: String(data.get('subject') ?? ''),
          message,
          listingReference: about || undefined,
          website: '',
        },
      });
      setSent(result.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The message was not stored');
    }
  };
  const again = () => setSent(null);

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Contact us — Araq &amp; Kahraman Auctions</title>
      <SiteHeader active="sell" />


      {/* @generated */}
      <section style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 48px var(--mkt-gutter-x) 0")}>
        <nav aria-label="Breadcrumb" style={css("font-size: 14px; color: #5B636B; margin-bottom: 10px")}>
          <Link href="/">Home</Link>
          {' '}
          <span aria-hidden="true">/</span>
          {" Contact"}
        </nav>
        <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(2.2rem, 4.4vw, 3.2rem); letter-spacing: -0.03em; font-weight: 700; line-height: 1.05")}>Get in touch</h1>
        <p style={css("margin: 10px 0 0; color: #5B636B; font-size: 18px; max-width: 56ch")}>
          {"Questions about a listing, an auction or selling with us? Send a message and it is stored for staff. For quick answers, try the "}
          <Link href="/help" style={css("font-weight: 600")}>Help centre</Link>
          .
        </p>
      </section>
      <div style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 32px var(--mkt-gutter-x) 80px; display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start")}>
        <section style={css("flex: 999 1 540px; min-width: 0; background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 22px; padding: clamp(22px, 3vw, 36px)")}>
          {sent && (
            <div role="status" style={css("padding: 20px; border: 1px solid #E3C78C; border-radius: 16px; background: #FBF7EE")}>
              <h2 style={css("margin: 0")}>Message stored</h2>
              <p>Reference {sent}. Our team can read it in the staff inbox. This page does not promise a reply time.</p>
              <button type="button" onClick={again}>Send another</button>
            </div>
          )}
          {error ? <p role="alert">{error}</p> : null}
          {!sent && (
            <Fragment>
            <form onSubmit={submit} style={css("display: flex; flex-direction: column; gap: 18px")}>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 24px; font-weight: 700")}>Send us a message</h2>
              <div style={css("display: flex; flex-wrap: wrap; gap: 18px")}>
                <div style={css("flex: 1 1 240px")}>
                  <label htmlFor="cn" className="lbl">Your name</label>
                  <input id="cn" name="name" className="field" autoComplete="name" required={true} />
                </div>
                <div style={css("flex: 1 1 240px")}>
                  <label htmlFor="cp" className="lbl">Mobile number (not stored)</label>
                  <input id="cp" className="field" type="tel" autoComplete="tel" placeholder="+974" />
                </div>
              </div>
              <div>
                <label htmlFor="ce" className="lbl">Email</label>
                <input id="ce" name="email" className="field" type="email" autoComplete="email" required />
              </div>
              <div>
                <label htmlFor="cref" className="lbl">About which ad? (optional)</label>
                <input
                  id="cref"
                  className="field"
                  value={about}
                  onChange={(event) => setAbout(event.target.value)}
                  placeholder="e.g. l_1a2b3c4d5"
                />
              </div>
              <div>
                <label htmlFor="ct" className="lbl">What's it about?</label>
                <select id="ct" name="subject" className="field" style={css("cursor: pointer")}>
                  <option>A listing or seller</option>
                  <option>Bidding or an auction I won</option>
                  <option>Selling at auction</option>
                  <option>Business auctions (fleet, equipment, estate)</option>
                  <option>My account</option>
                  <option>Report a problem</option>
                  <option>Careers</option>
                  <option>Something else</option>
                </select>
              </div>
              <div>
                <label htmlFor="cm" className="lbl">Message</label>
                <textarea
                  id="cm"
                  rows={6}
                  required={true}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  style={css('width: 100%; border: 1px solid #DAD7D0; border-radius: 12px; padding: 12px 14px; font: inherit; font-size: 16px; color: #15191E; resize: vertical')}
                ></textarea>
              </div>
              <button type="submit" className="btn-primary" style={css("align-self: flex-start; height: 54px; padding: 0 30px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>Send message</button>
            </form>
            </Fragment>
          )}
        </section>
        <aside style={css("flex: 1 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 14px")}>
          {CHANNELS.map((c, i) => (
            <Fragment key={i}>
            <div style={css("background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 18px; padding: 18px 20px; display: flex; gap: 14px; align-items: center")}>
              <span style={css("flex: 0 0 46px; height: 46px; border-radius: 12px; background: #F6EEDC; display: flex; align-items: center; justify-content: center")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.d}></path>
                </svg>
              </span>
              <div style={css("min-width: 0")}>
                <div style={css("font-size: 13px; color: #5B636B; text-transform: uppercase; letter-spacing: .06em")}>{c.k}</div>
                {c.href ? (
                  <a
                    href={c.href}
                    style={css("font-weight: 600; color: #15191E; word-break: break-word")}
                    {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {c.v}
                  </a>
                ) : (
                  <div style={css("font-weight: 600")}>{c.v}</div>
                )}
              </div>
            </div>
            </Fragment>
          ))}
          <div style={css("height: 220px; border-radius: 18px; background: #EFEDE7; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #5B636B")}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9A6B12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z M12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4z"></path>
            </svg>
            <span style={css("font-size: 14px; font-weight: 600; color: #2A3036")}>{OFFICE_ADDRESS}</span>
          </div>
        </aside>
      </div>
{/* @end-generated */}

      <SiteFooter />
    </div>
  );
}
