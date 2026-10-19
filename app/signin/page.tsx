'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import PasswordStrength, { passwordFieldMessage } from '../../components/PasswordStrength';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { ApiRequestError } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { evaluatePassword } from '../../lib/passwordPolicy';
import { safeReturnTo } from '../../lib/returnTo';
import { otpauthQrDataUrl } from '../../lib/otpQr';
import { useSession } from '../../lib/session';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import './signin.css';

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  identifier: string;
  keepSignedIn: boolean;
  termsAccepted: boolean;
};

const EMPTY_FORM: FormState = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  identifier: '',
  keepSignedIn: false,
  termsAccepted: false,
};

/** Errors are surfaced from the API envelope; nothing is invented client-side. */
function describeError(err: unknown): { message: string; fields: Record<string, string> } {
  if (err instanceof ApiRequestError) {
    return { message: err.body.message, fields: err.body.fieldErrors ?? {} };
  }
  return { message: 'We could not reach the server. Please try again.', fields: {} };
}

export default function SignInPage() {
  const router = useRouter();
  const session = useSession();
  const { t } = useUiLocale();
  const [mode, setMode] = useState('in');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('mode');
    if (fromUrl === 'up' || fromUrl === 'in') setMode(fromUrl);
  }, []);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecovery, setMfaRecovery] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [enrollStep, setEnrollStep] = useState<'qr' | 'recovery'>('qr');
  const [totpSecret, setTotpSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const field = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const next = target.type === 'checkbox' ? target.checked : target.value;
    setForm((f) => ({ ...f, [key]: next }));
  };

  const requestedReturnTo = () =>
    safeReturnTo(
      typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('returnTo'),
    );

  const needsEnrollStart =
    session.status === 'authenticated' && session.mfaRequired && !session.mfaEnabled && enrollStep !== 'recovery';

  useEffect(() => {
    if (!needsEnrollStart || totpSecret) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    void session
      .enrollMfa()
      .then(async ({ secret, otpauthUrl }) => {
        if (cancelled) return;
        setTotpSecret(secret);
        setQrDataUrl(await otpauthQrDataUrl(otpauthUrl));
        setEnrollStep('qr');
      })
      .catch((err) => {
        if (!cancelled) {
          const described = describeError(err);
          setError(described.message);
          setFieldErrors(described.fields);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsEnrollStart, totpSecret, session]);

  /** `null` means "stay on this page" (used when a step still has to happen, e.g. MFA). */
  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const destination = await action();
      if (destination !== null) router.push(destination);
    } catch (err) {
      const described = describeError(err);
      setError(described.message);
      setFieldErrors(described.fields);
    } finally {
      setBusy(false);
    }
  };

  const submitSignIn = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const result = await session.login({
        identifier: form.identifier.trim(),
        password: form.password,
        keepSignedIn: form.keepSignedIn,
        returnTo: requestedReturnTo(),
      });
      // A pre-MFA session is signed in but not yet privileged: stay on this page.
      // A pre-MFA session stays here until the challenge succeeds, so the panel must not be navigated away.
      return result.mfaRequired ? null : result.returnTo;
    });
  };

  const submitRegister = (e: FormEvent) => {
    e.preventDefault();
    const strength = evaluatePassword(form.password, { email: form.email.trim(), fullName: form.fullName.trim() });
    if (!strength.acceptable) {
      setError(t('password.blocked'));
      setFieldErrors({ password: passwordFieldMessage(strength, t) });
      return;
    }
    void run(async () => {
      const result = await session.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        termsAccepted: form.termsAccepted,
        returnTo: requestedReturnTo(),
      });
      return result.mfaRequired ? null : result.returnTo;
    });
  };

  const submitEnrollConfirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const codes = await session.confirmMfa(mfaCode.trim());
      setRecoveryCodes(codes);
      setMfaCode('');
      setEnrollStep('recovery');
      return null;
    });
  };

  const finishEnroll = () => {
    setTotpSecret('');
    setQrDataUrl(null);
    setRecoveryCodes([]);
    setEnrollStep('qr');
    router.push(requestedReturnTo());
  };

  const submitMfa = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mfaRecovery) {
        const remaining = await session.useRecoveryCode(mfaCode.trim());
        setNotice(
          `Recovery code accepted. ${remaining} code(s) left. If you lost your app, sign in with a recovery code then set up a new authenticator from this page.`,
        );
      } else {
        await session.completeMfa(mfaCode.trim());
      }
      setMfaCode('');
      return requestedReturnTo();
    });
  };

  const mfaRequired = session.status === 'authenticated' && session.mfaRequired;
  const mfaEnroll = (mfaRequired && !session.mfaEnabled) || (enrollStep === 'recovery' && recoveryCodes.length > 0);
  const mfaChallenge = mfaRequired && session.mfaEnabled;
  const errorBlock = error ? (
    <p role="alert" style={css('margin: 0 0 18px; padding: 12px 14px; border: 1px solid #E7C6A2; border-radius: 12px; background: #FDF3E7; color: #8A3B05; font-size: 15px')}>{error}</p>
  ) : null;
  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <div role="alert" style={css('font-size: 13px; color: #8A3B05; margin-top: 6px')}>{fieldErrors[key]}</div>
    ) : null;

  const tabs = [
    { id: 'in', label: 'Sign in' },
    { id: 'up', label: 'Create account' },
  ].map((t) => {
    const on = mode === t.id;
    return {
      label: t.label,
      selected: on,
      bg: on ? '#FFFFFF' : 'transparent',
      fg: on ? '#15191E' : '#4B535A',
      shadow: on ? '0 1px 3px rgba(21,25,30,.14)' : 'none',
      pick: () => setMode(t.id),
    };
  });

  const signIn = mode === 'in';
  const register = mode === 'up';
  const pwType = showPw ? 'text' : 'password';
  const pwBtn = showPw ? 'Hide' : 'Show';
  const togglePw = () => setShowPw((v) => !v);
  const switchQ = mode === 'in' ? 'New here?' : 'Already have an account?';
  const switchA = mode === 'in' ? 'Create an account' : 'Sign in';
  const switchMode = () => setMode((m) => (m === 'in' ? 'up' : 'in'));
  const busyLabel = busy ? 'Please wait…' : null;
  return (
    <div style={css(PAGE_ROOT)}>
      <title>Sign in — Araq &amp; Kahraman Auctions</title>
      <SiteHeader showSignIn={false} />

      {/* @generated */}
      <div style={css("max-width: var(--mkt-shell-max); margin: 0 auto; padding: 48px var(--mkt-gutter-x) 80px; display: flex; flex-wrap: wrap; gap: 0; align-items: stretch")}>
        <section style={css("flex: 1 1 380px; min-width: 0; background: #15191E; color: #FFFFFF; border-radius: 24px 0 0 24px; padding: clamp(28px, 4vw, 48px); display: flex; flex-direction: column; gap: 24px")}>
          <img src="/logo.png" alt="Araq & Kahraman Auctions" width="120" height="120" style={css("width: 120px; height: 120px; object-fit: contain; display: block")} />
          <div>
            <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: clamp(28px, 3vw, 38px); letter-spacing: -0.02em; font-weight: 700; line-height: 1.1")}>Welcome to Araq & Kahraman</h1>
            <p style={css("margin: 10px 0 0; color: #C9CFCB; font-size: 17px")}>One account to buy, sell and bid.</p>
          </div>
          <ul style={css("list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px")}>
            <li style={css("display: flex; gap: 12px; align-items: flex-start")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css("flex: 0 0 22px; margin-top: 1px")}>
                <path d="M14 4l6 6 M11 7l6 6 M12.5 5.5l-6 6 3 3 6-6 M8 13l-5 5 2 2 5-5"></path>
              </svg>
              <span>Bid on live auctions from your account</span>
            </li>
            <li style={css("display: flex; gap: 12px; align-items: flex-start")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css("flex: 0 0 22px; margin-top: 1px")}>
                <path d="M12 5v14 M5 12h14"></path>
              </svg>
              <span>Listings are prepared by our team, not posted from this form</span>
            </li>
            <li style={css("display: flex; gap: 12px; align-items: flex-start")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={css("flex: 0 0 22px; margin-top: 1px")}>
                <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path>
              </svg>
              <span>Questions go to our team. There is no in-app chat</span>
            </li>
          </ul>
        </section>
        <section style={css("flex: 1 1 420px; min-width: 0; background: #FFFFFF; border: 1px solid #E6E4DF; border-left: 0; border-radius: 0 24px 24px 0; padding: clamp(28px, 4vw, 48px)")}>
          {mfaEnroll ? (
            <Fragment>
            <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Set up authenticator</h2>
            <p style={css("margin: 0 0 20px; font-size: 15px; color: #5B636B")}>Two-step verification is required for your account. Scan the QR code with an authenticator app to continue.</p>
            {errorBlock}
            {enrollStep === 'qr' && (
              totpSecret ? (
              <form onSubmit={submitEnrollConfirm} style={css("display: flex; flex-direction: column; gap: 18px")}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Authenticator QR code" width={200} height={200} style={css("align-self: center; border-radius: 12px; border: 1px solid #E6E4DF")} />
                ) : null}
                <p style={css("margin: 0; font-size: 14px; color: #5B636B; word-break: break-all")}>
                  <span style={css("font-weight: 600; color: #15191E")}>Manual key: </span>
                  {totpSecret}
                </p>
                <p style={css("margin: 0; font-size: 14px; color: #5B636B")}>
                  Google Authenticator, Microsoft Authenticator, or any TOTP app.
                </p>
                <div>
                  <label htmlFor="enroll-code" className="lbl">6-digit code</label>
                  <input
                    id="enroll-code"
                    className="field"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                  {fieldError('code')}
                </div>
                <button type="submit" className="btn-primary" disabled={busy} style={css("height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>{busyLabel ?? 'Confirm authenticator'}</button>
              </form>
              ) : (
                <p style={css("margin: 0; font-size: 15px; color: #5B636B")}>{busyLabel ?? 'Preparing your QR code…'}</p>
              )
            )}
            {enrollStep === 'recovery' && (
              <div style={css("display: flex; flex-direction: column; gap: 18px")}>
                <p style={css("margin: 0; font-size: 15px; color: #5B636B")}>Save these recovery codes somewhere safe. Each can be used once if you lose access to your app.</p>
                <ul style={css("margin: 0; padding: 16px; list-style: none; background: #F3F1EC; border-radius: 12px; font-family: ui-monospace, monospace; font-size: 14px; line-height: 1.8")}>
                  {recoveryCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
                <button type="button" className="btn-primary" onClick={finishEnroll} style={css("height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>Continue</button>
              </div>
            )}
            </Fragment>
          ) : mfaChallenge ? (
            <Fragment>
            <h2 style={css("margin: 0 0 6px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Two-step verification</h2>
            <p style={css("margin: 0 0 20px; font-size: 15px; color: #5B636B")}>Enter the 6-digit code from your authenticator app to finish signing in.</p>
            {errorBlock}
            {notice && <p role="status" style={css("margin: 0 0 18px; padding: 12px 14px; border: 1px solid #CFE0C8; border-radius: 12px; background: #F2F8EF; color: #2F5D2A; font-size: 15px")}>{notice}</p>}
            <form onSubmit={submitMfa} style={css("display: flex; flex-direction: column; gap: 18px")}>
              <div>
                <label htmlFor="mfa" className="lbl">{mfaRecovery ? 'Recovery code' : 'Verification code'}</label>
                <input
                  id="mfa"
                  className="field"
                  inputMode={mfaRecovery ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  maxLength={mfaRecovery ? 24 : 6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  aria-invalid={error ? true : undefined}
                />
                {fieldError('code')}
              </div>
              <button type="submit" className="btn-primary" disabled={busy} style={css("height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>{busyLabel ?? 'Verify and continue'}</button>
              <button type="button" onClick={() => { setMfaRecovery((v) => !v); setMfaCode(''); setError(null); }} style={css("align-self: flex-start; border: 0; background: transparent; padding: 4px; color: #9A6B12; font: inherit; font-weight: 700; cursor: pointer")}>{mfaRecovery ? 'Use an authenticator code instead' : 'Use a recovery code instead'}</button>
            </form>
            </Fragment>
          ) : (
            <Fragment>
          <div role="tablist" aria-label="Account" style={css("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 5px; background: #F3F1EC; border-radius: 12px; margin-bottom: 28px")}>
            {tabs.map((t, i) => (
              <Fragment key={i}>
              <button type="button" role="tab" aria-selected={t.selected} onClick={t.pick} style={css(`height: 44px; border: 0; border-radius: 9px; font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; background: ${t.bg}; color: ${t.fg}; box-shadow: ${t.shadow}`)}>{t.label}</button>
              </Fragment>
            ))}
          </div>
          {signIn && (
            <Fragment>
            <form onSubmit={submitSignIn} style={css("display: flex; flex-direction: column; gap: 18px")}>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Sign in</h2>
              {errorBlock}
              <div>
                <label htmlFor="ph" className="lbl">Email</label>
                <input id="ph" className="field" type="email" autoComplete="email" placeholder="you@example.com" value={form.identifier} onChange={field('identifier')} aria-invalid={fieldErrors.identifier ? true : undefined} />
                {fieldError('identifier')}
              </div>
              <div>
                <div style={css("display: flex; justify-content: space-between; align-items: baseline")}>
                  <label htmlFor="pw" className="lbl">Password</label>
                  <Link href="/help" style={css("font-size: 14px; font-weight: 600")}>Forgot password?</Link>
                </div>
                <div style={css("position: relative")}>
                  <input id="pw" className="field" type={pwType} autoComplete="current-password" style={css("padding-right: 64px")} value={form.password} onChange={field('password')} aria-invalid={fieldErrors.password ? true : undefined} />
                  {fieldError('password')}
                  <button type="button" onClick={togglePw} style={css("position: absolute; right: 4px; top: 4px; height: 44px; padding: 0 12px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer")}>{pwBtn}</button>
                </div>
              </div>
              <label style={css("display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 15px")}>
                <input type="checkbox" style={css("width: 18px; height: 18px; accent-color: #9A6B12")} checked={form.keepSignedIn} onChange={field('keepSignedIn')} />
                Keep me signed in
              </label>
              <button type="submit" className="btn-primary" disabled={busy} style={css("height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>{busyLabel ?? 'Sign in'}</button>
            </form>
            </Fragment>
          )}
          {register && (
            <Fragment>
            <form onSubmit={submitRegister} style={css("display: flex; flex-direction: column; gap: 16px")}>
              <h2 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>Create your account</h2>
              {errorBlock}
              <div>
                <label htmlFor="nm" className="lbl">Full name</label>
                <input id="nm" className="field" autoComplete="name" value={form.fullName} onChange={field('fullName')} aria-invalid={fieldErrors.fullName ? true : undefined} />
                {fieldError('fullName')}
              </div>
              <div>
                <label htmlFor="em" className="lbl">Email</label>
                <input id="em" className="field" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={field('email')} aria-invalid={fieldErrors.email ? true : undefined} />
                {fieldError('email')}
              </div>
              <div>
                <label htmlFor="pw2" className="lbl">Password</label>
                <div style={css("position: relative")}>
                  <input
                    id="pw2"
                    className="field"
                    type={pwType}
                    autoComplete="new-password"
                    style={css("padding-right: 64px")}
                    value={form.password}
                    onChange={field('password')}
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby="pw2-strength"
                  />
                  <button type="button" onClick={togglePw} style={css("position: absolute; right: 4px; top: 4px; height: 44px; padding: 0 12px; border: 0; background: transparent; color: #9A6B12; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer")}>{pwBtn}</button>
                </div>
                <div id="pw2-strength">
                  <PasswordStrength password={form.password} email={form.email} fullName={form.fullName} />
                </div>
                {fieldError('password')}
              </div>
              <label style={css("display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 15px")}>
                <input type="checkbox" style={css("width: 18px; height: 18px; margin-top: 3px; accent-color: #9A6B12")} checked={form.termsAccepted} onChange={field('termsAccepted')} aria-invalid={fieldErrors.termsAccepted ? true : undefined} />
                <span>
                  {"I agree to the "}
                  <Link href="/legal" style={css("font-weight: 600")}>Terms</Link>
                  {" and "}
                  <Link href="/legal" style={css("font-weight: 600")}>Privacy policy</Link>
                  .
                </span>
              </label>
              {fieldError('termsAccepted')}
              <button type="submit" className="btn-primary" disabled={busy} style={css("height: 54px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; font-size: 17px; cursor: pointer")}>{busyLabel ?? 'Create account'}</button>
            </form>
            </Fragment>
          )}
          <p style={css("margin: 24px 0 0; text-align: center; font-size: 15px; color: #5B636B")}>
            {switchQ}{' '}
            <button type="button" onClick={switchMode} style={css("border: 0; background: transparent; padding: 4px; color: #9A6B12; font: inherit; font-weight: 700; cursor: pointer")}>{switchA}</button>
          </p>
            </Fragment>
          )}
        </section>
      </div>
{/* @end-generated */}

      <SiteFooter minimal />
    </div>
  );
}
