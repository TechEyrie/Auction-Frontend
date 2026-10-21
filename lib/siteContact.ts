/** Public contact details shown on the catalogue site. */

export const CAREERS_EMAIL = 'careers@areeqamberauctio.qa';
export const CONTACT_EMAIL = 'contact@araqandkahramanauctions.qa';
export const OFFICE_ADDRESS = 'Doha, Qatar';

/**
 * WhatsApp business number in E.164 digits only (country code, no + or spaces).
 * Set `NEXT_PUBLIC_WHATSAPP_NUMBER` on Vercel / `.env.local` to override.
 */
export const WHATSAPP_E164 = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '97474040003').replace(/\D/g, '');

/** Display form, e.g. +974 7404 0003 */
export function formatWhatsAppDisplay(e164 = WHATSAPP_E164): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('974')) {
    return `+974 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : '';
}

export const PHONE_DISPLAY = formatWhatsAppDisplay();

export function whatsappChatUrl(prefill?: string): string {
  const base = `https://wa.me/${WHATSAPP_E164}`;
  if (!prefill) return base;
  return `${base}?text=${encodeURIComponent(prefill)}`;
}

export function telHref(e164 = WHATSAPP_E164): string {
  return `tel:+${e164.replace(/\D/g, '')}`;
}

export function mailtoHref(email = CONTACT_EMAIL): string {
  return `mailto:${email}`;
}
