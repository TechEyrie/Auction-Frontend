'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from './session';
import { UiLocaleProvider } from './UiLocaleProvider';
import { UiThemeProvider } from './UiThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UiThemeProvider>
        <UiLocaleProvider>{children}</UiLocaleProvider>
      </UiThemeProvider>
    </SessionProvider>
  );
}
