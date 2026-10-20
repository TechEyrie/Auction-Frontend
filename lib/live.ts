'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

export type LiveEvent = {
  eventId: string;
  type: string;
  auctionId: string;
  version: number;
  occurredAt: string;
  data: { amountMinor: number | null; sequence: number | null; status: string | null; outcome: string | null };
};

let socket: Socket | null = null;
let users = 0;
const handlers = new Set<(event: LiveEvent) => void>();
const statusHandlers = new Set<(up: boolean) => void>();
const seen = new Set<string>();

function ensure(): Socket {
  if (socket) return socket;
  const origin = /^https?:\/\//i.test(API_BASE_URL) ? API_BASE_URL : undefined;
  const next = io(origin, { withCredentials: true, transports: ['websocket'] });
  next.on('connect', () => {
    next.emit('join', 'auctions');
    statusHandlers.forEach((fn) => fn(true));
  });
  next.on('disconnect', () => statusHandlers.forEach((fn) => fn(false)));
  next.on('auction', (event: LiveEvent) => {
    if (!event?.eventId || seen.has(event.eventId)) return;
    seen.add(event.eventId);
    if (seen.size > 200) seen.clear();
    handlers.forEach((fn) => fn(event));
  });
  socket = next;
  return next;
}

/** One shared socket. The last unmount closes it, so route changes do not stack listeners. */
export function useLive(onEvent: (event: LiveEvent) => void): boolean {
  const current = useRef(onEvent);
  current.current = onEvent;
  const [up, setUp] = useState(false);

  useEffect(() => {
    users += 1;
    const client = ensure();
    const handler = (event: LiveEvent) => current.current(event);
    handlers.add(handler);
    const status = (value: boolean) => setUp(value);
    statusHandlers.add(status);
    setUp(client.connected);
    return () => {
      handlers.delete(handler);
      statusHandlers.delete(status);
      users -= 1;
      if (users <= 0) {
        socket?.disconnect();
        socket = null;
        users = 0;
      }
    };
  }, []);

  return up;
}
