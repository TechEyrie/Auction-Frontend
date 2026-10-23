'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import { ApiRequestError, apiFetch } from '../../lib/api';
import { css, PAGE_ROOT } from '../../lib/css';
import { fmtMinor } from '../../lib/format';
import { productPath } from '../../lib/listings';
import { otpauthQrDataUrl } from '../../lib/otpQr';
import { orderSourceLabel, paymentStateLabel } from '../../lib/qatarPlaces';
import { useChromeTranslate } from '../../lib/siteChrome';
import { useSession } from '../../lib/session';
import { useAsync } from '../../lib/useAsync';

type Account = {
  profile: { fullName: string; email: string | null; phone: string | null; termsVersion: string | null; publicReference: string };
  bids: { lotReference: string; amountMinor: number; sequence: number; acceptedAt: string }[];
  orders: {
    orderReference: string;
    source?: string;
    lotReference: string | null;
    listingReference: string;
    listingTitle?: string;
    winningPriceMinor: number;
    paymentState: string;
    currency: string;
    createdAt: string;
  }[];
};

export default function AccountPage() {
  const session = useSession();
  const ct = useChromeTranslate('auth');
  const at = useChromeTranslate('account');
  const router = useRouter();
  const account = useAsync<Account>(
    () => {
      if (session.status !== 'authenticated' || !session.user) {
        return Promise.reject(new Error('Sign in to see your account'));
      }
      return apiFetch<Account>('/api/account');
    },
    [session.status, session.user?.publicReference],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [bidListingByAuctionId, setBidListingByAuctionId] = useState<Record<string, string>>({});
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaEnableOpen, setMfaEnableOpen] = useState(false);
  const [mfaReplaceOpen, setMfaReplaceOpen] = useState(false);
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false);
  const [mfaStep, setMfaStep] = useState<'verify' | 'qr' | 'recovery'>('verify');
  const [mfaCurrentCode, setMfaCurrentCode] = useState('');
  const [mfaNewCode, setMfaNewCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const terms = useAsync<{ version: number; body: string }>(() => apiFetch('/api/content/terms'), []);

  useEffect(() => {
    const bids = account.data?.bids ?? [];
    if (bids.length === 0) {
      setBidListingByAuctionId({});
      return;
    }
    const auctionIds = [...new Set(bids.map((bid) => bid.lotReference))];
    void Promise.all(
      auctionIds.map(async (auctionId) => {
        try {
          const result = await apiFetch<{ auction: { listingReference: string } }>(
            `/api/auctions/${encodeURIComponent(auctionId)}`,
            { cache: 'no-store' },
          );
          return [auctionId, result.auction.listingReference] as const;
        } catch {
          return [auctionId, null] as const;
        }
      }),
    ).then((pairs) => {
      const next: Record<string, string> = {};
      for (const [auctionId, listingReference] of pairs) {
        if (listingReference) next[auctionId] = listingReference;
      }
      setBidListingByAuctionId(next);
    });
  }, [account.data?.bids]);

  useEffect(() => {
    if (session.status === 'anonymous') router.replace('/signin?returnTo=/account');
  }, [session.status, router]);

  useEffect(() => {
    if (session.status === 'authenticated' && session.mfaRequired) {
      router.replace('/signin?returnTo=/account');
    }
  }, [session.status, session.mfaRequired, router]);

  const resetMfaEnable = () => {
    setMfaEnableOpen(false);
    setMfaStep('verify');
    setMfaNewCode('');
    setMfaSecret('');
    setMfaQrDataUrl(null);
    setMfaRecoveryCodes([]);
    setMfaError(null);
  };

  const mfaApiError = (err: unknown, fallbackMessage: string) => {
    if (err instanceof ApiRequestError) {
      const details = err.body.details;
      if (details?.reason === 'EMAIL_NOT_VERIFIED' || details?.code === 'EMAIL_NOT_VERIFIED') {
        return ct('auth.account.mfa.emailNotVerified');
      }
      return err.body.message;
    }
    return fallbackMessage;
  };

  const resetMfaReplace = () => {
    setMfaReplaceOpen(false);
    setMfaEnableOpen(false);
    setMfaStep('verify');
    setMfaCurrentCode('');
    setMfaNewCode('');
    setMfaSecret('');
    setMfaQrDataUrl(null);
    setMfaRecoveryCodes([]);
    setMfaError(null);
  };

  const startMfaEnable = () => {
    setMfaBusy(true);
    setMfaError(null);
    setMfaEnableOpen(true);
    void session
      .enrollMfa()
      .then(async ({ secret, otpauthUrl }) => {
        setMfaSecret(secret);
        setMfaQrDataUrl(await otpauthQrDataUrl(otpauthUrl));
        setMfaStep('qr');
      })
      .catch((err: unknown) => {
        setMfaEnableOpen(false);
        setMfaError(mfaApiError(err, ct('auth.account.mfa.enable')));
      })
      .finally(() => setMfaBusy(false));
  };

  const resetMfaDisable = () => {
    setMfaDisableOpen(false);
    setMfaCurrentCode('');
    setMfaError(null);
  };

  const submitMfaDisable = (e: FormEvent) => {
    e.preventDefault();
    const code = mfaCurrentCode.trim();
    if (!code) {
      setMfaError(ct('auth.account.mfa.codeRequired'));
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    void session
      .disableMfa(code)
      .then(() => {
        resetMfaDisable();
      })
      .catch((err: unknown) => {
        setMfaError(mfaApiError(err, ct('auth.account.mfa.disableConfirm')));
      })
      .finally(() => setMfaBusy(false));
  };

  const submitMfaReplaceStart = (e: FormEvent) => {
    e.preventDefault();
    const code = mfaCurrentCode.trim();
    if (!code) {
      setMfaError(ct('auth.account.mfa.codeRequired'));
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    void session
      .enrollMfa(code)
      .then(async ({ secret, otpauthUrl }) => {
        setMfaSecret(secret);
        setMfaQrDataUrl(await otpauthQrDataUrl(otpauthUrl));
        setMfaStep('qr');
      })
      .catch((err: unknown) => {
        setMfaError(mfaApiError(err, ct('auth.account.mfa.replace')));
      })
      .finally(() => setMfaBusy(false));
  };

  const submitMfaEnrollConfirm = (e: FormEvent) => {
    e.preventDefault();
    const code = mfaNewCode.trim();
    if (!code) {
      setMfaError(ct('auth.account.mfa.codeRequired'));
      return;
    }
    setMfaBusy(true);
    setMfaError(null);
    void session
      .confirmMfa(code)
      .then((codes) => {
        setMfaRecoveryCodes(codes);
        setMfaNewCode('');
        setMfaStep('recovery');
      })
      .catch((err: unknown) => {
        setMfaError(mfaApiError(err, ct('auth.account.mfa.confirmNew')));
      })
      .finally(() => setMfaBusy(false));
  };

  const accept = async (version: number) => {
    setNotice(null);
    try {
      const result = await apiFetch<{ termsVersion: string }>('/api/account/terms', {
        method: 'POST',
        headers: session.authHeaders(),
        json: { version },
      });
      setNotice(`Accepted terms version ${result.termsVersion}`);
      account.reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not record acceptance');
    }
  };

  const signOut = async () => {
    await session.logout();
    router.push('/');
  };

  return (
    <div style={css(PAGE_ROOT)}>
      <SiteHeader />
      <main style={css('max-width: 880px; margin: 0 auto; padding: 32px 24px 64px; display: grid; gap: 20px')}>
        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center')}>
          <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif")}>{at('account.h1')}</h1>
          {session.user ? (
            <button type="button" onClick={() => void signOut()} style={css('height: 42px; padding: 0 16px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}>
              {ct('auth.signOut')}
            </button>
          ) : null}
        </div>

        {session.status === 'loading' || (!account.data && !account.error) ? <p>{at('account.loading')}</p> : null}
        {account.error ? (
          <p role="alert">
            {account.error}{' '}
            <button type="button" onClick={() => account.reload()}>{at('account.retry')}</button>
            {' · '}
            <Link href="/signin?returnTo=/account">{at('account.signIn')}</Link>
          </p>
        ) : null}

        {account.data ? (
          <>
            <section style={css('background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 16px; padding: 18px 20px; display: grid; gap: 8px; color: var(--mkt-text)')}>
              <h2 style={css('margin: 0; font-size: 18px')}>{at('account.profile')}</h2>
              <p style={css('margin: 0')}>{account.data.profile.fullName}</p>
              <p style={css('margin: 0; color: var(--mkt-muted)')}>{account.data.profile.email ?? at('account.noEmail')} · {account.data.profile.phone ?? at('account.noPhone')}</p>
              <p style={css('margin: 0')}>{at('account.termsAccepted', { version: account.data.profile.termsVersion ?? at('account.termsNone') })}</p>
              {terms.data ? (
                <button type="button" onClick={() => void accept(terms.data!.version)} style={css('justify-self: start; height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                  {at('account.acceptTerms', { version: terms.data.version })}
                </button>
              ) : (
                <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>{at('account.noTermsDoc')}</p>
              )}
              {notice ? <p role="status">{notice}</p> : null}
            </section>

            <section style={css('background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 16px; padding: 18px 20px; display: grid; gap: 12px; color: var(--mkt-text)')}>
              <h2 style={css('margin: 0; font-size: 18px')}>{ct('auth.account.mfa.title')}</h2>
              {mfaStep === 'recovery' && mfaRecoveryCodes.length > 0 ? (
                <div style={css('display: grid; gap: 12px')}>
                  <p style={css('margin: 0; font-size: 14px; color: var(--mkt-muted)')}>{ct('auth.account.mfa.saveRecovery')}</p>
                  <ul style={css('margin: 0; padding: 16px; list-style: none; background: var(--mkt-surface-2); border-radius: 12px; font-family: ui-monospace, monospace; font-size: 14px; line-height: 1.8; color: var(--mkt-text)')}>
                    {mfaRecoveryCodes.map((code) => (
                      <li key={code}>{code}</li>
                    ))}
                  </ul>
                  <button type="button" onClick={resetMfaReplace} style={css('justify-self: start; height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                    {ct('auth.account.mfa.done')}
                  </button>
                </div>
              ) : session.mfaEnabled ? (
                <>
                <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>
                  {ct('auth.account.mfa.enabledIntro')}
                </p>
                {!mfaReplaceOpen && !mfaDisableOpen ? (
                  <div style={css('display: flex; flex-wrap: wrap; gap: 10px')}>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaReplaceOpen(true);
                        setMfaStep('verify');
                        setMfaError(null);
                      }}
                      style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}
                    >
                      {ct('auth.account.mfa.replace')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaDisableOpen(true);
                        setMfaError(null);
                      }}
                      style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}
                    >
                      {ct('auth.account.mfa.disable')}
                    </button>
                  </div>
                ) : mfaDisableOpen ? (
                  <>
                    {mfaError ? <p role="alert" style={css('margin: 0; color: #8A3B05')}>{mfaError}</p> : null}
                    <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>{ct('auth.account.mfa.disableIntro')}</p>
                    <form onSubmit={submitMfaDisable} style={css('display: grid; gap: 12px')}>
                      <div>
                        <label htmlFor="mfa-disable-current" style={css('display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px')}>{ct('auth.account.mfa.currentCodeLabel')}</label>
                        <input id="mfa-disable-current" className="field" inputMode="text" autoComplete="one-time-code" value={mfaCurrentCode} onChange={(e) => setMfaCurrentCode(e.target.value)} />
                      </div>
                      <div style={css('display: flex; flex-wrap: wrap; gap: 10px')}>
                        <button type="submit" disabled={mfaBusy} style={css('height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                          {mfaBusy ? ct('auth.pleaseWait') : ct('auth.account.mfa.disableConfirm')}
                        </button>
                        <button type="button" onClick={resetMfaDisable} style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}>
                          {ct('auth.account.mfa.cancel')}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    {mfaError ? <p role="alert" style={css('margin: 0; color: #8A3B05')}>{mfaError}</p> : null}
                    {mfaStep === 'verify' ? (
                      <form onSubmit={submitMfaReplaceStart} style={css('display: grid; gap: 12px')}>
                        <div>
                          <label htmlFor="mfa-replace-current" style={css('display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px')}>{ct('auth.account.mfa.currentCodeLabel')}</label>
                          <input id="mfa-replace-current" className="field" inputMode="text" autoComplete="one-time-code" value={mfaCurrentCode} onChange={(e) => setMfaCurrentCode(e.target.value)} />
                        </div>
                        <div style={css('display: flex; flex-wrap: wrap; gap: 10px')}>
                          <button type="submit" disabled={mfaBusy} style={css('height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                            {mfaBusy ? ct('auth.pleaseWait') : ct('auth.account.mfa.continue')}
                          </button>
                          <button type="button" onClick={resetMfaReplace} style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}>
                            {ct('auth.account.mfa.cancel')}
                          </button>
                        </div>
                      </form>
                    ) : null}
                    {mfaStep === 'qr' ? (
                      <form onSubmit={submitMfaEnrollConfirm} style={css('display: grid; gap: 12px')}>
                        {mfaQrDataUrl ? (
                          <img src={mfaQrDataUrl} alt={ct('auth.account.mfa.qrAlt')} width={200} height={200} style={css('border-radius: 12px; border: 1px solid var(--mkt-border)')} />
                        ) : null}
                        <p style={css('margin: 0; font-size: 14px; color: var(--mkt-muted); word-break: break-all')}>
                          <span style={css('font-weight: 600; color: var(--mkt-text)')}>{ct('auth.account.mfa.manualKeyPrefix')}</span>
                          {mfaSecret}
                        </p>
                        <div>
                          <label htmlFor="mfa-replace-new" style={css('display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px')}>{ct('auth.account.mfa.newCodeLabel')}</label>
                          <input id="mfa-replace-new" className="field" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={mfaNewCode} onChange={(e) => setMfaNewCode(e.target.value)} />
                        </div>
                        <button type="submit" disabled={mfaBusy} style={css('justify-self: start; height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                          {mfaBusy ? ct('auth.pleaseWait') : ct('auth.account.mfa.confirmNew')}
                        </button>
                      </form>
                    ) : null}
                  </>
                )}
                </>
              ) : (
                  <>
                    {!mfaEnableOpen ? (
                      <>
                        <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>
                          {ct('auth.account.mfa.offIntro')}
                        </p>
                        {mfaError ? <p role="alert" style={css('margin: 0; color: #8A3B05')}>{mfaError}</p> : null}
                        <button
                          type="button"
                          disabled={mfaBusy}
                          onClick={startMfaEnable}
                          style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}
                        >
                          {mfaBusy ? ct('auth.pleaseWait') : ct('auth.account.mfa.enable')}
                        </button>
                      </>
                    ) : (
                      <>
                        {mfaError ? <p role="alert" style={css('margin: 0; color: #8A3B05')}>{mfaError}</p> : null}
                        {mfaStep === 'qr' ? (
                          <form onSubmit={submitMfaEnrollConfirm} style={css('display: grid; gap: 12px')}>
                            <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>{ct('auth.account.mfa.enableLead')}</p>
                            {mfaQrDataUrl ? (
                              <img src={mfaQrDataUrl} alt={ct('auth.account.mfa.qrAlt')} width={200} height={200} style={css('border-radius: 12px; border: 1px solid var(--mkt-border)')} />
                            ) : null}
                            <p style={css('margin: 0; font-size: 14px; color: var(--mkt-muted); word-break: break-all')}>
                              <span style={css('font-weight: 600; color: var(--mkt-text)')}>{ct('auth.account.mfa.manualKeyPrefix')}</span>
                              {mfaSecret}
                            </p>
                            <div>
                              <label htmlFor="mfa-enable-new" style={css('display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px')}>{ct('auth.account.mfa.newCodeLabel')}</label>
                              <input id="mfa-enable-new" className="field" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={mfaNewCode} onChange={(e) => setMfaNewCode(e.target.value)} />
                            </div>
                            <div style={css('display: flex; flex-wrap: wrap; gap: 10px')}>
                              <button type="submit" disabled={mfaBusy} style={css('height: 42px; padding: 0 14px; border: 0; border-radius: 10px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 600; cursor: pointer')}>
                                {mfaBusy ? ct('auth.pleaseWait') : ct('auth.account.mfa.confirmNew')}
                              </button>
                              <button type="button" onClick={resetMfaEnable} style={css('height: 42px; padding: 0 14px; border: 1px solid var(--mkt-border-strong); border-radius: 10px; background: var(--mkt-surface); color: var(--mkt-text); font: inherit; font-weight: 600; cursor: pointer')}>
                                {ct('auth.account.mfa.cancel')}
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </>
                    )}
                  </>
              )}
            </section>

            <section style={css('display: grid; gap: 10px')}>
              <h2 style={css('margin: 0')}>{at('account.purchases')}</h2>
              <p style={css('margin: 0; color: var(--mkt-muted); font-size: 14px')}>
                {at('account.purchasesLead')}
              </p>
              {account.data.orders.length === 0 ? (
                <p style={css('margin: 0; padding: 16px; border-radius: 14px; border: 1px dashed var(--mkt-border-strong); background: var(--mkt-bg); color: var(--mkt-muted)')}>
                  {at('account.noPurchasesPrefix')}<Link href="/browse">{at('account.noPurchasesBrowse')}</Link>{at('account.noPurchasesOr')}<Link href="/auctions">{at('account.noPurchasesAuctions')}</Link>.
                </p>
              ) : (
                <ul style={css('list-style: none; margin: 0; padding: 0; display: grid; gap: 10px')}>
                  {account.data.orders.map((order) => {
                    const title = order.listingTitle?.trim() || at('account.purchasedItem');
                    const needsPay = order.paymentState === 'awaiting_payment' || order.paymentState === 'failed';
                    return (
                      <li
                        key={order.orderReference}
                        style={css('background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 16px; padding: 16px 18px; display: grid; gap: 10px; color: var(--mkt-text)')}
                      >
                        <div style={css('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: start')}>
                          <div style={css('display: grid; gap: 4px; min-width: 0')}>
                            <span style={css('font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #9A6B12')}>
                              {orderSourceLabel(order.source)}
                            </span>
                            <Link
                              href={productPath({ listingReference: order.listingReference })}
                              style={css("font-family: 'Schibsted Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: var(--mkt-text)")}
                            >
                              {title}
                            </Link>
                            <span style={css('color: var(--mkt-muted); font-size: 14px')}>
                              {fmtMinor(order.winningPriceMinor)} · {paymentStateLabel(order.paymentState)}
                            </span>
                            <span style={css('color: var(--mkt-muted); font-size: 13px')}>{new Date(order.createdAt).toLocaleString()}</span>
                          </div>
                          <Link
                            href={`/account/orders/${encodeURIComponent(order.orderReference)}`}
                            style={css(
                              needsPay
                                ? 'display: inline-flex; align-items: center; height: 44px; padding: 0 16px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700; white-space: nowrap'
                                : 'display: inline-flex; align-items: center; height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--mkt-border-strong); background: var(--mkt-surface); color: var(--mkt-text); font-weight: 700; white-space: nowrap',
                            )}
                          >
                            {needsPay ? at('account.enterDelivery') : at('account.viewOrder')}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section style={css('display: grid; gap: 10px')}>
              <h2 style={css('margin: 0')}>{at('account.bids')}</h2>
              {account.data.bids.length === 0 ? (
                <p>{at('account.noBidsPrefix')}<Link href="/auctions">{at('account.noBidsLink')}</Link></p>
              ) : (
                <ul style={css('list-style: none; margin: 0; padding: 0; display: grid; gap: 8px')}>
                  {account.data.bids.map((bid) => {
                    const listingReference = bidListingByAuctionId[bid.lotReference];
                    const bidHref = listingReference ? productPath({ listingReference }) : '/auctions';
                    return (
                      <li key={`${bid.lotReference}-${bid.sequence}`} style={css('background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 12px; padding: 12px 14px; color: var(--mkt-text)')}>
                        <Link href={bidHref} style={css('font-weight: 700')}>
                          {listingReference ? at('account.openListing') : at('account.liveAuction')}
                        </Link>
                        {' · '}{fmtMinor(bid.amountMinor)}{' · '}bid #{bid.sequence}
                        <div style={css('color: var(--mkt-muted); font-size: 13px; margin-top: 4px')}>{new Date(bid.acceptedAt).toLocaleString()}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
