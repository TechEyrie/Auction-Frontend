import type { ReactNode } from 'react';
import WhatsAppFloat from '../components/WhatsAppFloat';
import './globals.css';
import { SessionProvider } from '../lib/session';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
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
