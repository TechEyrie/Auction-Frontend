/** Public contact details shown on the catalogue site. */

export const CAREERS_EMAIL = 'careers@areeqamberauctio.qa';

/**
 * WhatsApp business number in E.164 digits only (country code, no + or spaces).
 * Set `NEXT_PUBLIC_WHATSAPP_NUMBER` on Vercel / `.env.local` to override.
 */
export const WHATSAPP_E164 = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '97459929039').replace(/\D/g, '');

export function whatsappChatUrl(prefill?: string): string {
  const base = `https://wa.me/${WHATSAPP_E164}`;
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}
