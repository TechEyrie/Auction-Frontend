'use client';

/**
 * Session provider: the single place the frontend asks the server "who am I?".
 *
 * The browser never stores an auth credential — the session lives in an HttpOnly
 * cookie, so React state here is a *cache of the server's answer*, never the source
 * of truth. Every mutation echoes the CSRF token in `x-csrf-token` because CORS
 * alone is not CSRF protection.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from './api';

export type SessionUser = {
  publicReference: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'disabled';
  roles: string[];
  preferredLocale: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  termsVersion: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

type SessionResponse = {
  user: SessionUser | null;
  mfaRequired: boolean;
  mfaEnabled: boolean;
  capabilities: string[];
  csrfToken: string;
};

export type SessionValue = {
  status: SessionStatus;
  user: SessionUser | null;
  /** True when a privileged account is signed in but has not answered the MFA challenge. */
  mfaRequired: boolean;
  mfaEnabled: boolean;
  capabilities: string[];
  refresh: () => Promise<void>;
  /** Double-submit CSRF header for admin mutations made outside this provider. */
  authHeaders: () => Record<string, string>;
  /** Ensures a CSRF token is loaded before guest or authed POST mutations. */
  ensureCsrfHeaders: () => Promise<Record<string, string>>;
  login: (input: {
    identifier: string;
    password: string;
    keepSignedIn?: boolean;
    returnTo?: string;
  }) => Promise<{ returnTo: string; mfaRequired: boolean }>;
  register: (input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    termsAccepted: boolean;
    returnTo?: string;
  }) => Promise<{ returnTo: string; mfaRequired: boolean; emailVerified: boolean }>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enrollMfa: (code?: string) => Promise<{ secret: string; otpauthUrl: string }>;
  confirmMfa: (code: string) => Promise<string[]>;
  disableMfa: (code: string) => Promise<void>;
  completeMfa: (code: string) => Promise<void>;
  completeLoginOtp: (code: string) => Promise<void>;
  resendLoginOtp: () => Promise<void>;
  useRecoveryCode: (code: string) => Promise<number>;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Same-origin only: the CSRF cookie is on the API host. On a split Vercel→API
 * deploy, `document.cookie` cannot see it — the JSON `csrfToken` from
 * `/api/auth/session` is the source of truth.
 */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'csrf') return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const csrfTokenRef = useRef(csrfToken);
  csrfTokenRef.current = csrfToken;

  const apply = useCallback((body: SessionResponse) => {
    setUser(body.user);
    setMfaRequired(body.mfaRequired);
    setMfaEnabled(body.mfaEnabled === true);
    setCapabilities(body.capabilities ?? []);
    // Prefer the body token: cross-origin cookies are not visible to document.cookie.
    setCsrfToken(body.csrfToken || readCsrfCookie());
    setStatus(body.user ? 'authenticated' : 'anonymous');
  }, []);

  const refresh = useCallback(async () => {
    const body = await apiFetch<SessionResponse>('/api/auth/session', { cache: 'no-store' });
    apply(body);
    return body;
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    // An unreachable API must not look like a signed-in user: fail closed to anonymous.
    refresh().catch(() => {
      if (!cancelled) {
        setUser(null);
        setMfaRequired(false);
        setMfaEnabled(false);
        setCapabilities([]);
        setCsrfToken(null);
        setStatus('anonymous');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /**
   * Mutations need the double-submit header. Bootstrap (or re-bootstrap) the
   * session CSRF token first — a cold register click before GET /session finishes
   * previously sent no header and looked like a CSRF failure.
   */
  const ensureCsrfHeaders = useCallback(async (): Promise<Record<string, string>> => {
    let token = csrfTokenRef.current;
    if (!token) {
      try {
        const body = await refresh();
        token = body.csrfToken || csrfTokenRef.current;
      } catch {
        throw new Error(
          'Could not reach the API to start a secure session. Check that the site can talk to the backend, then try again.',
        );
      }
    }
    if (!token) {
      throw new Error(
        'Secure session token is missing. Refresh the page. If this continues on the live site, the API cookie settings (SameSite) or CORS origin list need updating.',
      );
    }
    return { 'x-csrf-token': token };
  }, [refresh]);

  // CORS alone is not CSRF protection: every mutation echoes the double-submit token.
  const mutatingHeaders = useCallback(
    (): Record<string, string> => (csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    [csrfToken],
  );

  const value = useMemo<SessionValue>(() => {
    return {
      status,
      user,
      mfaRequired,
      mfaEnabled,
      capabilities,
      async enrollMfa(code?: string) {
        return apiFetch<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/enroll', {
          method: 'POST',
          json: code ? { code } : {},
          headers: await ensureCsrfHeaders(),
        });
      },
      async confirmMfa(code: string) {
        const result = await apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/enroll/confirm', {
          method: 'POST',
          json: { code },
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
        return result.recoveryCodes;
      },
      async disableMfa(code: string) {
        await apiFetch<{ ok: boolean }>('/api/auth/mfa/disable', {
          method: 'POST',
          json: { code },
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
      },
      refresh: async () => {
        await refresh();
      },
      authHeaders: mutatingHeaders,
      ensureCsrfHeaders,
      async login(input) {
        const result = await apiFetch<{ user: SessionUser; mfaRequired: boolean; returnTo: string }>(
          '/api/auth/login',
          { method: 'POST', json: input, headers: await ensureCsrfHeaders() },
        );
        await refresh();
        return { returnTo: result.returnTo, mfaRequired: result.mfaRequired };
      },
      async register(input) {
        const result = await apiFetch<{ user: SessionUser; returnTo: string }>('/api/auth/register', {
          method: 'POST',
          json: input,
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
        return { returnTo: result.returnTo, mfaRequired: false, emailVerified: false };
      },
      async verifyEmail(token) {
        await apiFetch<{ ok: boolean }>('/api/auth/email/verify', {
          method: 'POST',
          json: { token },
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
      },
      async resendVerificationEmail(email?: string) {
        await apiFetch<{ ok: boolean }>('/api/auth/email/resend', {
          method: 'POST',
          json: email ? { email } : {},
          headers: await ensureCsrfHeaders(),
        });
      },
      async forgotPassword(email) {
        await apiFetch<{ ok: boolean }>('/api/auth/password/forgot', {
          method: 'POST',
          json: { identifier: email },
          headers: await ensureCsrfHeaders(),
        });
      },
      async resetPassword(token, password) {
        await apiFetch<{ ok: boolean }>('/api/auth/password/reset', {
          method: 'POST',
          json: { token, password },
          headers: await ensureCsrfHeaders(),
        });
      },
      async logout() {
        await apiFetch<{ ok: boolean }>('/api/auth/logout', {
          method: 'POST',
          json: {},
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
      },
      async completeMfa(code) {
        await apiFetch<{ ok: boolean }>('/api/auth/mfa/challenge', {
          method: 'POST',
          json: { code },
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
      },
      async completeLoginOtp(code) {
        await apiFetch<{ ok: boolean }>('/api/auth/login/otp', {
          method: 'POST',
          json: { code },
          headers: await ensureCsrfHeaders(),
        });
        await refresh();
      },
      async resendLoginOtp() {
        await apiFetch<{ ok: boolean }>('/api/auth/login/otp/resend', {
          method: 'POST',
          json: {},
          headers: await ensureCsrfHeaders(),
        });
      },
      async useRecoveryCode(code) {
        const result = await apiFetch<{ ok: boolean; remainingRecoveryCodes: number }>(
          '/api/auth/mfa/recovery',
          { method: 'POST', json: { code }, headers: await ensureCsrfHeaders() },
        );
        await refresh();
        return result.remainingRecoveryCodes;
      },
    };
  }, [status, user, mfaRequired, mfaEnabled, capabilities, refresh, mutatingHeaders, ensureCsrfHeaders]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
