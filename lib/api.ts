/**
 * Typed API client foundation.
 *
 * Not yet wired into any page — later phases replace the demo/local state with
 * these calls. The base URL is a public, non-secret variable; never put secrets
 * in NEXT_PUBLIC_* variables.
 */

/** Local dev backend; used when NEXT_PUBLIC_API_BASE_URL is unset (not when explicitly empty). */
const DEV_API_BASE_URL = 'http://localhost:4000';

function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  // When the env var is set (including to ""), honor it — empty means same-origin /api rewrites.
  if (raw !== undefined) return raw.trim();
  if (process.env.NODE_ENV === 'development') return DEV_API_BASE_URL;
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

export type ApiErrorBody = {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
  requestId: string;
  details: Record<string, unknown>;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;
  readonly requestId: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || `Request failed with status ${status}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
    this.requestId = body.requestId;
  }
}

function normalizeError(status: number, payload: unknown): ApiRequestError {
  const error = (payload as { error?: Partial<ApiErrorBody> } | null)?.error ?? {};
  return new ApiRequestError(status, {
    code: error.code ?? 'INTERNAL',
    message: error.message ?? 'Request failed',
    fieldErrors: error.fieldErrors ?? {},
    requestId: error.requestId ?? '',
    details: error.details ?? {},
  });
}

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  /** JSON body; serialized automatically. */
  json?: unknown;
  /** Sent as the Idempotency-Key header for retryable mutations. */
  idempotencyKey?: string;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, idempotencyKey, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw normalizeError(response.status, payload);
  return payload as T;
}
