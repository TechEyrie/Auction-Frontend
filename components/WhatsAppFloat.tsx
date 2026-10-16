'use client';

import { usePathname } from 'next/navigation';
import { whatsappChatUrl } from '../lib/siteContact';

/**
 * Site-wide floating WhatsApp entry — bottom-right on public pages only.
 */
export default function WhatsAppFloat() {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/admin')) return null;

  return (
    <a
      href={whatsappChatUrl('Hello, I have a question about Araq & Kahraman Auctions.')}
      className="wa-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm0 1.7a7.3 7.3 0 0 1 6.2 11 7.3 7.3 0 0 1-8.4 1.7l-.5-.3-2.8.7.7-2.7-.3-.5A7.3 7.3 0 0 1 12 4.7zm4.1 9.5c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1-.5.7-.7.8-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.6 6.6 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.4-.4.1-.3c0-.1 0-.3-.1-.4s-.5-1.2-.7-1.6-.4-.4-.5-.4h-.4c-.1 0-.4.1-.5.3a1.8 1.8 0 0 0-.6 1.3 3.1 3.1 0 0 0 .7 1.7 7.1 7.1 0 0 0 2.7 2.5 9 9 0 0 0 1 .4 2.4 2.4 0 0 0 1.1.1 1.9 1.9 0 0 0 1.2-.8 1.5 1.5 0 0 0 .1-.8c0-.1-.2-.2-.4-.3z" />
      </svg>
    </a>
  );
}
