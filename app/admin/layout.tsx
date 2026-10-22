'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { LangToggle } from '../../components/LangToggle';
import { ThemeToggle } from '../../components/ThemeToggle';
import { css, PAGE_ROOT } from '../../lib/css';
import { useSession } from '../../lib/session';
import { useUiLocale } from '../../lib/UiLocaleProvider';
import type { MessageKey } from '../../lib/uiMessages';
import './admin.css';

/**
 * Branded admin shell.
 *
 * The navigation is derived from server-returned capabilities, but the gate itself is
 * only a usability measure: every admin API re-checks the capability, the account
 * status and the MFA state server-side. Hiding a link is never authorization.
 *
 * Every state (loading, anonymous, MFA required, no capabilities, ready) renders inside
 * the same branded chrome — an operator who lands here without access should still see
 * the product's own header, not a bare error page.
 */

const SECTIONS: Array<{ labelKey: MessageKey; href: string; capability?: string }> = [
  { labelKey: 'admin.nav.overview', href: '/admin' },
  { labelKey: 'admin.nav.products', href: '/admin/listings' },
  { labelKey: 'admin.nav.auctions', href: '/admin/auctions', capability: 'auctions.manage' },
  { labelKey: 'admin.nav.categories', href: '/admin/taxonomy' },
  { labelKey: 'admin.nav.attributes', href: '/admin/attributes' },
  { labelKey: 'admin.nav.locations', href: '/admin/locations' },
  { labelKey: 'admin.nav.media', href: '/admin/media' },
  { labelKey: 'admin.nav.users', href: '/admin/users', capability: 'users.view' },
  { labelKey: 'admin.nav.finance', href: '/admin/finance', capability: 'finance.view' },
  { labelKey: 'admin.nav.content', href: '/admin/content', capability: 'content.manage' },
  { labelKey: 'admin.nav.enquiries', href: '/admin/enquiries', capability: 'content.manage' },
];

function EnrollPanel() {
  const session = useSession();
  const { t } = useUiLocale();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    void session.enrollMfa()
      .then((result) => setSecret(result.secret))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('admin.enroll.startFailed')))
      .finally(() => setBusy(false));
  };

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    void session.confirmMfa(code.trim())
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('admin.enroll.codeFailed')))
      .finally(() => setBusy(false));
  };

  return (
    <section style={css('background: var(--mkt-surface); border: 1px solid var(--mkt-border); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px')}>
      <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px")}>{t('admin.enroll.title')}</h1>
      <p style={css('margin: 0; color: var(--mkt-muted)')}>{t('admin.enroll.lead')}</p>
      {error && <p role="alert" style={css('margin: 0; color: #8A3B05')}>{error}</p>}
      {!secret ? (
        <form onSubmit={start} style={css('display: flex; flex-direction: column; gap: 12px')}>
          <button type="submit" disabled={busy} className="btn-primary" style={css('height: 48px; border: 0; border-radius: 12px; background: var(--mkt-gold); color: var(--mkt-surface); font: inherit; font-weight: 700; cursor: pointer')}>{busy ? t('admin.common.pleaseWait') : t('admin.enroll.showSecret')}</button>
        </form>
      ) : (
        <form onSubmit={confirm} style={css('display: flex; flex-direction: column; gap: 12px')}>
          <p style={css('margin: 0')}>{t('admin.enroll.secretHint')}</p>
          <code style={css('display: block; padding: 12px; background: var(--mkt-bg); border-radius: 10px; word-break: break-all')}>{secret}</code>
          <label htmlFor="enroll-code">{t('admin.enroll.codeLabel')}</label>
          <input id="enroll-code" className="field" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit" disabled={busy} className="btn-primary" style={css('height: 48px; border: 0; border-radius: 12px; background: var(--mkt-gold); color: var(--mkt-surface); font: inherit; font-weight: 700; cursor: pointer')}>{busy ? t('admin.common.pleaseWait') : t('admin.enroll.confirm')}</button>
        </form>
      )}
    </section>
  );
}

function BrandHeader({ onSignOut, identity }: { onSignOut?: () => void; identity?: string }) {
  const { t } = useUiLocale();
  return (
    <header className="adm-topbar">
      <div className="adm-chrome-inner adm-topbar__inner">
        <Link href="/" aria-label={t('header.brandHome')} className="adm-topbar__brand">
          <img src="/logo.png" alt="" width={44} height={44} className="adm-topbar__logo" />
          <span className="adm-topbar__brand-text">
            <span className="adm-topbar__brand-name">{t('header.brandName')}</span>
            <span className="adm-topbar__brand-sub">{t('admin.brandSub')}</span>
          </span>
        </Link>
        <div className="adm-topbar__account">
          <LangToggle />
          <ThemeToggle variant="desktop" />
          {identity && onSignOut ? (
            <>
              <span className="adm-topbar__identity">{identity}</span>
              <button type="button" className="adm-topbar__signout" onClick={onSignOut}>
                {t('header.signOut')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function AdminNav({
  sections,
  pathname,
}: {
  sections: Array<{ label: string; href: string }>;
  pathname: string;
}) {
  const { t } = useUiLocale();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const current = sections.find((section) => navIsCurrent(pathname, section.href)) ?? sections[0];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function renderLinks(onNavigate?: () => void) {
    return sections.map((section) => (
      <Link
        key={section.href}
        href={section.href}
        aria-current={navIsCurrent(pathname, section.href) ? 'page' : undefined}
        onClick={onNavigate}
      >
        {section.label}
      </Link>
    ));
  }

  return (
    <>
      <div className="adm-nav-mobile-bar">
        <div className="adm-nav-mobile-bar__current">
          <span className="adm-nav-mobile-bar__label">{t('admin.nav.section')}</span>
          <strong>{current?.label ?? t('admin.brandSub')}</strong>
        </div>
        <button
          type="button"
          className="adm-nav-mobile-bar__btn"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {t('admin.nav.menu')}
        </button>
      </div>

      <nav aria-label={t('admin.nav.sectionsAria')} className="adm-nav adm-nav--desktop">
        {renderLinks()}
        <LangToggle variant="nav" />
      </nav>

      {open ? (
        <div className="adm-nav-drawer is-open">
          <button type="button" className="adm-nav-drawer__backdrop" aria-label={t('admin.nav.closeMenu')} onClick={() => setOpen(false)} />
          <div id={menuId} className="adm-nav-drawer__panel" role="dialog" aria-modal="true" aria-label={t('admin.nav.adminMenu')}>
            <div className="adm-nav-drawer__head">
              <span>{t('admin.nav.adminMenu')}</span>
              <button type="button" className="adm-nav-drawer__close" aria-label={t('admin.nav.closeMenu')} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <nav aria-label={t('admin.nav.sectionsMobileAria')} className="adm-nav adm-nav--drawer">
              {renderLinks(() => setOpen(false))}
              <LangToggle variant="nav" />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BrandFooter() {
  const { t } = useUiLocale();
  return (
    <footer className="foot" style={css('background: var(--mkt-footer-bg); color: var(--mkt-footer-fg); margin-top: 40px')}>
      <div className="adm-chrome-inner" style={css('padding-block: 20px; font-size: 14px')}>
        {t('admin.footer')}
      </div>
    </footer>
  );
}

/** A gate state: branded chrome, one honest sentence, one way forward. */
function Gate({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <main className="adm-gate" style={css('max-width: 640px; margin: 0 auto; padding: 72px 24px 96px')}>
      <h1 style={css("margin: 0 0 10px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>{title}</h1>
      <p style={css('margin: 0 0 18px; color: var(--mkt-muted)')}>{body}</p>
      {action}
    </main>
  );
}

function navIsCurrent(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const { t } = useUiLocale();

  useEffect(() => {
    if (session.status === 'anonymous') router.replace('/signin?returnTo=%2Fadmin');
  }, [session.status, router]);

  const signedOut = (
    <div style={css(PAGE_ROOT)}>
      <BrandHeader />
      <Gate
        title={session.status === 'loading' ? t('admin.gate.checkingSession') : t('admin.gate.redirecting')}
        body={t('admin.gate.body')}
      />
      <BrandFooter />
    </div>
  );

  if (session.status === 'loading' || session.status === 'anonymous') return signedOut;

  const navSections = SECTIONS.filter((section) => !section.capability || session.capabilities.includes(section.capability)).map(
    ({ labelKey, href }) => ({ label: t(labelKey), href }),
  );

  const chrome = (content: ReactNode, showNav = true) => (
    <div style={css(PAGE_ROOT)}>
      <BrandHeader
        identity={session.user ? `${session.user.fullName} · ${t('admin.roleSuffix')}` : undefined}
        onSignOut={() => { void session.logout().then(() => router.replace('/signin')); }}
      />
      <div className="adm-shell">
        {showNav ? <AdminNav sections={navSections} pathname={pathname} /> : null}
        <main className="adm-main">{content}</main>
      </div>
      <BrandFooter />
    </div>
  );

  if (session.mfaRequired && !session.mfaEnabled) {
    return chrome(<EnrollPanel />, false);
  }

  if (session.mfaRequired) {
    return chrome(
      <Gate
        title={t('admin.gate.mfaTitle')}
        body={t('admin.gate.mfaBody')}
        action={
          <Link className="btn-primary" href="/signin?returnTo=%2Fadmin" style={css('display: inline-flex; align-items: center; height: 52px; padding: 0 22px; border-radius: 12px; background: var(--mkt-gold); color: var(--mkt-surface); font-weight: 700')}>
            {t('admin.gate.continueMfa')}
          </Link>
        }
      />,
      false,
    );
  }

  if (session.capabilities.length === 0) {
    return chrome(
      <Gate
        title={t('admin.gate.noAccessTitle')}
        body={t('admin.gate.noAccessBody')}
        action={<Link href="/" style={css('font-weight: 600')}>{t('admin.gate.backMarketplace')}</Link>}
      />,
      false,
    );
  }

  return chrome(children);
}
