'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ReloadOptions = {
  /** Keep prior `data` visible and leave `loading` false while refetching. */
  soft?: boolean;
};

export type AsyncResource<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: (options?: ReloadOptions) => void;
  setData: (next: T) => void;
};

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * The load / error / retry contract every admin screen needs, in one place.
 *
 * An admin screen must never render a plausible empty table when the request actually
 * failed, so `error` and `data` are kept distinct and the caller renders both states
 * explicitly.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[] = []): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const ticketRef = useRef(0);
  const softNextRef = useRef(false);
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;

  const reload = useCallback((options?: ReloadOptions) => {
    softNextRef.current = options?.soft === true;
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    const soft = softNextRef.current;
    softNextRef.current = false;
    if (!soft || dataRef.current === null) {
      setLoading(true);
    }
    setError(null);
    load()
      .then((value) => {
        if (ticketRef.current !== ticket) return;
        setData(value);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ticketRef.current !== ticket) return;
        setError(messageOf(err));
        setLoading(false);
      });
    // `deps` describes the request; `nonce` is an explicit retry of the same request.
     
  }, [...deps, nonce]);

  return {
    data,
    error,
    loading,
    reload,
    setData: (next: T) => setData(next),
  };
}
