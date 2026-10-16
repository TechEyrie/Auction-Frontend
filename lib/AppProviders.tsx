'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from './session';
import { UiLocaleProvider } from './UiLocaleProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UiLocaleProvider>{children}</UiLocaleProvider>
    </SessionProvider>
  );
}
