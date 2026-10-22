import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import WhatsAppFloat from '../components/WhatsAppFloat';
import './globals.css';
import { AppProviders } from '../lib/AppProviders';

/** Favicon / apple icon come from `app/icon.png` and `app/apple-icon.png` (site logo). */
export const metadata: Metadata = {
  title: {
    default: 'Araq & Kahraman Auctions',
    template: '%s — Araq & Kahraman Auctions',
  },
};

const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t='light';var s=localStorage.getItem('araq-ui-theme');if(s==='dark'||s==='light')t=s;else if(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)t='dark';var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <AppProviders>
          {children}
          <WhatsAppFloat />
        </AppProviders>
      </body>
    </html>
  );
}
