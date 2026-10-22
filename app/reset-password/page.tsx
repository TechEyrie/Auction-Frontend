'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import PasswordGenerator from '../../components/PasswordGenerator';
import PasswordStrength, { passwordFieldMessage } from '../../components/PasswordStrength';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { ApiRequestError } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { evaluatePassword } from '../../lib/passwordPolicy';
import { useSession } from '../../lib/session';
import { useChromeTranslate } from '../../lib/siteChrome';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import '../signin/signin.css';

function describeError(err: unknown): { message: string; fields: Record<string, string> } {
  if (err instanceof ApiRequestError) {
    return { message: err.body.message, fields: err.body.fieldErrors ?? {} };
  }
  return { message: 'We could not reach the server. Please try again.', fields: {} };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const session = useSession();
  const { t } = useUiLocale();
  const ct = useChromeTranslate('auth');
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resetEmail, setResetEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    setToken(fromUrl?.trim() ? fromUrl.trim() : '');
    try {
      const stored = sessionStorage.getItem('passwordResetEmail');
      if (stored?.trim()) setResetEmail(stored.trim());
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  const pwType = showPw ? 'text' : 'password';
  const pwBtn = showPw ? ct('auth.password.hide') : ct('auth.password.show');
  const busyLabel = busy ? ct('auth.pleaseWait') : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!token) {
      setError(ct('auth.reset.invalid.body'));
      return;
    }
    if (password !== confirm) {
      setFieldErrors({ confirm: ct('auth.reset.mismatch') });
      return;
    }
    const strength = evaluatePassword(password, { email: resetEmail });
    if (!strength.acceptable) {
      setFieldErrors({ password: passwordFieldMessage(strength, t) });
      return;
    }
    setBusy(true);
    try {
      await session.resetPassword(token, password);
      router.replace('/signin?mode=in');
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fields);
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <div role="alert" style={css('font-size: 13px; color: #8A3B05; margin-top: 6px')}>{fieldErrors[key]}</div>
    ) : null;

  const missingToken = token === '';

  return (
    <div style={css(PAGE_ROOT)}>
      <title>{ct('auth.reset.pageTitle')}</title>
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
            alt={ct('auth.logoAlt')}
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
              {ct('auth.reset.hero.title')}
            </h1>
            <p style={css('margin: 10px 0 0; color: #C9CFCB; font-size: 17px')}>{ct('auth.reset.hero.lead')}</p>
          </div>
        </section>
        <section
          style={css(
            'flex: 1 1 420px; min-width: 0; background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-left: 0; border-radius: 0 24px 24px 0; padding: clamp(28px, 4vw, 48px); color: var(--mkt-text)',
          )}
        >
          {token === null ? (
            <p style={css('margin: 0; font-size: 15px; color: var(--mkt-muted)')}>{ct('auth.reset.loading')}</p>
          ) : missingToken ? (
            <div style={css('display: flex; flex-direction: column; gap: 18px')}>
              <h2
                style={css(
                  "margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700",
                )}
              >
                {ct('auth.reset.invalid.title')}
              </h2>
              <p role="alert" style={css('margin: 0; font-size: 15px; color: var(--mkt-muted)')}>
                {ct('auth.reset.invalid.body')}
              </p>
              <Link href="/forgot-password" style={css('color: var(--mkt-gold); font-weight: 700; font-size: 15px')}>
                {ct('auth.reset.requestNewLink')}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} style={css('display: flex; flex-direction: column; gap: 18px')}>
              <h2
                style={css(
                  "margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700",
                )}
              >
                {ct('auth.reset.form.title')}
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
                <label htmlFor="pw" className="lbl">{ct('auth.field.password')}</label>
                <div style={css('position: relative')}>
                  <input
                    id="pw"
                    className="field"
                    type={pwType}
                    autoComplete="new-password"
                    style={css('padding-right: 64px')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby="pw-strength"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={css(
                      'position: absolute; right: 4px; top: 4px; height: 44px; padding: 0 12px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer',
                    )}
                  >
                    {pwBtn}
                  </button>
                </div>
                <PasswordGenerator
                  email={resetEmail}
                  onGenerate={(next) => {
                    setPassword(next);
                    setConfirm(next);
                    setShowPw(true);
                  }}
                />
                <div id="pw-strength">
                  <PasswordStrength password={password} email={resetEmail} />
                </div>
                {fieldError('password')}
              </div>
              <div>
                <label htmlFor="confirm" className="lbl">{ct('auth.reset.confirmPassword')}</label>
                <input
                  id="confirm"
                  className="field"
                  type={pwType}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={fieldErrors.confirm ? true : undefined}
                />
                {fieldError('confirm')}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
                style={css(
                  'height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer',
                )}
              >
                {busyLabel ?? ct('auth.reset.submit')}
              </button>
            </form>
          )}
        </section>
      </div>

      <SiteFooter minimal />
    </div>
  );
}
