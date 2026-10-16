import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import WhatsAppFloat from '../components/WhatsAppFloat';
import './globals.css';
import { SessionProvider } from '../lib/session';

/** Favicon / apple icon come from `app/icon.png` and `app/apple-icon.png` (site logo). */
export const metadata: Metadata = {
  title: {
    default: 'Araq & Kahraman Auctions',
    template: '%s — Araq & Kahraman Auctions',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <SessionProvider>
          {children}
          <WhatsAppFloat />
        </SessionProvider>
      </body>
    </html>
  );
}
