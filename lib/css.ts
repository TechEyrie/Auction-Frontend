import type { CSSProperties } from 'react';

/* The DCLogic runtime parsed inline CSS strings into React style objects.
   Same CSS, same result — one small parser instead of thousands of hand-written objects. */
export function css(text: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of text.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    if (!prop) continue;
    const key = prop.startsWith('--')
      ? prop
      : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}

/* The wrapper style every page carries (identical in all 12 templates). */
export const PAGE_ROOT =
  "font-family: 'Figtree', system-ui, sans-serif; color: #15191E; background: #FBFAF7; min-width: 0; font-size: 16px; line-height: 1.5";
