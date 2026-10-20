'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { ApiRequestError } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { useSession } from '../../lib/session';
import '../signin/signin.css';

function describeError(err: unknown): string {
  if (err instanceof ApiRequestError) return err.body.message;
  return 'We could not reach the server. Please try again.';
}

export default function ForgotPasswordPage() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const trimmed = email.trim();
      await session.forgotPassword(trimmed);
      sessionStorage.setItem('passwordResetEmail', trimmed);
      setDone(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const busyLabel = busy ? 'Please wait…' : null;

  return (
    <div style={css(PAGE_ROOT)}>
      <title>Forgot password — Araq &amp; Kahraman Auctions</title>
      <SiteHeader showSignIn={false} />

      <div
        style={css(
          'max-width: var(--mkt-shell-max); margin: 0 auto; padding: 48px var(--mkt-gutter-x) 80px; display: flex; flex-wrap: wrap; gap: 0; align-items: stretch',
        )}
      >
        <section
          style={css(
            'flex: 1 1 380px; min-width: 0; background: #15191E; color: #FFFFFF; border-radius: 24px 0 0 24px; padding: clamp(28px, 4vw, 48px); display: flex; flex-direction: column; gap: 24px',
          )}
        >
          <img
            src="/logo.png"
            alt="Araq & Kahraman Auctions"
            width="120"
            height="120"
            style={css('width: 120px; height: 120px; object-fit: contain; display: block')}
          />
          <div>
            <h1
              style={css(
                "margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(28px, 3vw, 38px); letter-spacing: -0.02em; font-weight: 700; line-height: 1.1",
              )}
            >
              Reset your password
            </h1>
            <p style={css('margin: 10px 0 0; color: #C9CFCB; font-size: 17px')}>
              We will email you a secure link if that address is on an account.
            </p>
          </div>
        </section>
        <section
          style={css(
            'flex: 1 1 420px; min-width: 0; background: #FFFFFF; border: 1px solid #E6E4DF; border-left: 0; border-radius: 0 24px 24px 0; padding: clamp(28px, 4vw, 48px)',
          )}
        >
          {done ? (
            <div style={css('display: flex; flex-direction: column; gap: 18px')}>
              <h2
                style={css(
                  "margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700",
                )}
              >
                Check your email
              </h2>
              <p role="status" style={css('margin: 0; font-size: 15px; color: #5B636B')}>
                If that email is on an account, we sent a reset link.
              </p>
              <Link
                href="/signin?mode=in"
                style={css('color: #9A6B12; font-weight: 700; font-size: 15px')}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={css('display: flex; flex-direction: column; gap: 18px')}>
              <h2
                style={css(
                  "margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700",
                )}
              >
                Forgot password
              </h2>
              {error && (
                <p
                  role="alert"
                  style={css(
                    'margin: 0; padding: 12px 14px; border: 1px solid #E8C4B0; border-radius: 12px; background: #FDF4EF; color: #8A3B05; font-size: 15px',
                  )}
                >
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="email" className="lbl">Email</label>
                <input
                  id="email"
                  className="field"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                style={css(
                  'height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer',
                )}
              >
                {busyLabel ?? 'Send reset link'}
              </button>
              <Link
                href="/signin?mode=in"
                style={css('align-self: flex-start; color: #9A6B12; font-weight: 700; font-size: 15px')}
              >
                Back to sign in
              </Link>
            </form>
          )}
        </section>
      </div>

      <SiteFooter minimal />
    </div>
  );
}
