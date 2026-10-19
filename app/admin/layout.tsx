'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { css, PAGE_ROOT } from '../../lib/css';
import { useSession } from '../../lib/session';
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

const SECTIONS: Array<{ label: string; href: string; capability?: string }> = [
  { label: 'Overview', href: '/admin' },
  { label: 'Products', href: '/admin/listings' },
  { label: 'Auctions', href: '/admin/auctions', capability: 'auctions.manage' },
  // Sellers nav hidden until offline-seller workflow is operator-facing (page/API kept at /admin/sellers).
  // { label: 'Sellers', href: '/admin/sellers' },
  { label: 'Categories', href: '/admin/taxonomy' },
  { label: 'Attributes', href: '/admin/attributes' },
  { label: 'Locations', href: '/admin/locations' },
  { label: 'Media', href: '/admin/media' },
  { label: 'Users', href: '/admin/users', capability: 'users.view' },
  { label: 'Finance', href: '/admin/finance', capability: 'finance.view' },
  { label: 'Enquiries', href: '/admin/enquiries', capability: 'content.manage' },
];

function EnrollPanel() {
  const session = useSession();
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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Enrollment could not start'))
      .finally(() => setBusy(false));
  };

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    void session.confirmMfa(code.trim())
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'That code was not accepted'))
      .finally(() => setBusy(false));
  };

  return (
    <section style={css('background: #FFFFFF; border: 1px solid #E6E4DF; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 14px')}>
      <h1 style={css("margin: 0; font-family: 'Schibsted Grotesk', sans-serif; font-size: 28px")}>Set up two-step verification</h1>
      <p style={css('margin: 0; color: #5B636B')}>Staff tools stay locked until an authenticator is confirmed. No charge or listing is created by this step.</p>
      {error && <p role="alert" style={css('margin: 0; color: #8A3B05')}>{error}</p>}
      {!secret ? (
        <form onSubmit={start} style={css('display: flex; flex-direction: column; gap: 12px')}>
          <button type="submit" disabled={busy} style={css('height: 48px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>{busy ? 'Please wait…' : 'Show authenticator secret'}</button>
        </form>
      ) : (
        <form onSubmit={confirm} style={css('display: flex; flex-direction: column; gap: 12px')}>
          <p style={css('margin: 0')}>Add this secret to an authenticator app, then enter the 6-digit code.</p>
          <code style={css('display: block; padding: 12px; background: #FBFAF7; border-radius: 10px; word-break: break-all')}>{secret}</code>
          <label htmlFor="enroll-code">Verification code</label>
          <input id="enroll-code" className="field" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="submit" disabled={busy} style={css('height: 48px; border: 0; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font: inherit; font-weight: 700; cursor: pointer')}>{busy ? 'Please wait…' : 'Confirm and unlock admin'}</button>
        </form>
      )}
    </section>
  );
}

function BrandHeader({ onSignOut, identity }: { onSignOut?: () => void; identity?: string }) {
  return (
    <header className="adm-topbar">
      <div className="adm-chrome-inner adm-topbar__inner">
        <Link href="/" aria-label="Araq & Kahraman Auctions home" className="adm-topbar__brand">
          <img src="/logo.png" alt="" width={44} height={44} className="adm-topbar__logo" />
          <span className="adm-topbar__brand-text">
            <span className="adm-topbar__brand-name">ARAQ &amp; KAHRAMAN</span>
            <span className="adm-topbar__brand-sub">ADMIN</span>
          </span>
        </Link>
        {identity && onSignOut ? (
          <div className="adm-topbar__account">
            <span className="adm-topbar__identity">{identity}</span>
            <button type="button" className="adm-topbar__signout" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        ) : null}
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
          <span className="adm-nav-mobile-bar__label">Section</span>
          <strong>{current?.label ?? 'Admin'}</strong>
        </div>
        <button
          type="button"
          className="adm-nav-mobile-bar__btn"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>

      <nav aria-label="Admin sections" className="adm-nav adm-nav--desktop">
        {renderLinks()}
      </nav>

      {open ? (
        <div className="adm-nav-drawer is-open">
          <button type="button" className="adm-nav-drawer__backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div id={menuId} className="adm-nav-drawer__panel" role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="adm-nav-drawer__head">
              <span>Admin menu</span>
              <button type="button" className="adm-nav-drawer__close" aria-label="Close menu" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <nav aria-label="Admin sections mobile" className="adm-nav adm-nav--drawer">
              {renderLinks(() => setOpen(false))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BrandFooter() {
  return (
    <footer className="foot" style={css('background: #15191E; color: #C9CFCB; margin-top: 40px')}>
      <div className="adm-chrome-inner" style={css('padding-block: 20px; font-size: 14px')}>
        Araq &amp; Kahraman Auctions — internal administration
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
    <main style={css('max-width: 640px; margin: 0 auto; padding: 72px 24px 96px')}>
      <h1 style={css("margin: 0 0 10px; font-family: 'Schibsted Grotesk', sans-serif; font-size: 26px; font-weight: 700")}>{title}</h1>
      <p style={css('margin: 0 0 18px; color: #5B636B')}>{body}</p>
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

  useEffect(() => {
    if (session.status === 'anonymous') router.replace('/signin?returnTo=%2Fadmin');
  }, [session.status, router]);

  const signedOut = (
    <div style={css(PAGE_ROOT)}>
      <BrandHeader />
      <Gate
        title={session.status === 'loading' ? 'Checking your session…' : 'Redirecting to sign in…'}
        body="The administration area needs a signed-in account with administration capabilities."
      />
      <BrandFooter />
    </div>
  );

  if (session.status === 'loading' || session.status === 'anonymous') return signedOut;

  const navSections = SECTIONS.filter((section) => !section.capability || session.capabilities.includes(section.capability)).map(
    ({ label, href }) => ({ label, href }),
  );

  const chrome = (content: ReactNode, showNav = true) => (
    <div style={css(PAGE_ROOT)}>
      <BrandHeader
        identity={session.user ? `${session.user.fullName} · Admin` : undefined}
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
        title="Two-step verification required"
        body="Your account needs a verification code before the admin tools unlock."
        action={
          <Link className="btn-primary" href="/signin?returnTo=%2Fadmin" style={css('display: inline-flex; align-items: center; height: 52px; padding: 0 22px; border-radius: 12px; background: #9A6B12; color: #FFFFFF; font-weight: 700')}>
            Continue verification
          </Link>
        }
      />,
      false,
    );
  }

  if (session.capabilities.length === 0) {
    return chrome(
      <Gate
        title="No admin access"
        body="This account does not hold any administration capabilities."
        action={<Link href="/" style={css('font-weight: 600')}>Back to the marketplace</Link>}
      />,
      false,
    );
  }

  return chrome(children);
}
