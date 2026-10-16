/**
 * Safe post-login return path.
 *
 * Mirrors the server rule (docs/03, C10): only same-site absolute paths are ever
 * returned. A crafted `?returnTo=https://evil.example` or `//evil.example` must not
 * turn sign-in into an open redirect, and the client must not rely on the server
 * alone to enforce it.
 */
export function safeReturnTo(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (raw === '' || !raw.startsWith('/')) return fallback;
  // Protocol-relative ("//host") and backslash ("/\\host") forms are absolute URLs
  // to the browser, not internal paths.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw.includes('\\') || raw.includes('\n') || raw.includes('\r')) return fallback;
  // "/javascript:alert(1)"-style values are not paths either.
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return fallback;
  return raw;
}
