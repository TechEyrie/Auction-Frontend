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
  }) => Promise<{ returnTo: string }>;
  logout: () => Promise<void>;
  enrollMfa: (currentPassword: string) => Promise<{ secret: string; otpauthUrl: string }>;
  confirmMfa: (code: string) => Promise<string[]>;
  completeMfa: (code: string) => Promise<void>;
  useRecoveryCode: (code: string) => Promise<number>;
};

const SessionContext = createContext<SessionValue | null>(null);

/** Read the double-submit token straight from the readable CSRF cookie. */
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

  const apply = useCallback((body: SessionResponse) => {
    setUser(body.user);
    setMfaRequired(body.mfaRequired);
    setMfaEnabled(body.mfaEnabled === true);
    setCapabilities(body.capabilities ?? []);
    setCsrfToken(body.csrfToken ?? readCsrfCookie());
    setStatus(body.user ? 'authenticated' : 'anonymous');
  }, []);

  const refresh = useCallback(async () => {
    const body = await apiFetch<SessionResponse>('/api/auth/session', { cache: 'no-store' });
    apply(body);
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
        setStatus('anonymous');
      }
    });
    return () => {
      cancelled = true;
    };
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
      async enrollMfa(currentPassword: string) {
        return apiFetch<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/enroll', {
          method: 'POST',
          json: { currentPassword },
          headers: mutatingHeaders(),
        });
      },
      async confirmMfa(code: string) {
        const result = await apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/enroll/confirm', {
          method: 'POST',
          json: { code },
          headers: mutatingHeaders(),
        });
        await refresh();
        return result.recoveryCodes;
      },
      refresh,
      authHeaders: mutatingHeaders,
      async login(input) {
        const result = await apiFetch<{ user: SessionUser; mfaRequired: boolean; returnTo: string }>(
          '/api/auth/login',
          { method: 'POST', json: input, headers: mutatingHeaders() },
        );
        await refresh();
        return { returnTo: result.returnTo, mfaRequired: result.mfaRequired };
      },
      async register(input) {
        const result = await apiFetch<{ user: SessionUser; returnTo: string }>('/api/auth/register', {
          method: 'POST',
          json: input,
          headers: mutatingHeaders(),
        });
        await refresh();
        return { returnTo: result.returnTo };
      },
      async logout() {
        await apiFetch<{ ok: boolean }>('/api/auth/logout', {
          method: 'POST',
          json: {},
          headers: mutatingHeaders(),
        });
        await refresh();
      },
      async completeMfa(code) {
        await apiFetch<{ ok: boolean }>('/api/auth/mfa/challenge', {
          method: 'POST',
          json: { code },
          headers: mutatingHeaders(),
        });
        await refresh();
      },
      async useRecoveryCode(code) {
        const result = await apiFetch<{ ok: boolean; remainingRecoveryCodes: number }>(
          '/api/auth/mfa/recovery',
          { method: 'POST', json: { code }, headers: mutatingHeaders() },
        );
        await refresh();
        return result.remainingRecoveryCodes;
      },
    };
  }, [status, user, mfaRequired, mfaEnabled, capabilities, refresh, mutatingHeaders]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
