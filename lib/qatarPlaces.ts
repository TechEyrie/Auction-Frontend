import type { MessageKey } from './uiMessages';

type LabelTranslate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Qatar cities and common places for checkout / delivery dropdowns. */
export const QATAR_PLACES: readonly { value: string; label: string }[] = [
  { value: 'Doha', label: 'Doha' },
  { value: 'Abu Hamour', label: 'Abu Hamour' },
  { value: 'Al Sadd, Doha', label: 'Al Sadd, Doha' },
  { value: 'West Bay, Doha', label: 'West Bay, Doha' },
  { value: 'The Pearl, Doha', label: 'The Pearl, Doha' },
  { value: 'Katara, Doha', label: 'Katara, Doha' },
  { value: 'Old Airport, Doha', label: 'Old Airport, Doha' },
  { value: 'Al Waab, Doha', label: 'Al Waab, Doha' },
  { value: 'Bin Mahmoud, Doha', label: 'Bin Mahmoud, Doha' },
  { value: 'Lusail', label: 'Lusail' },
  { value: 'Al Rayyan', label: 'Al Rayyan' },
  { value: 'Al Wakrah', label: 'Al Wakrah' },
  { value: 'Al Khor', label: 'Al Khor' },
  { value: 'Umm Salal', label: 'Umm Salal' },
  { value: 'Al Daayen', label: 'Al Daayen' },
  { value: 'Al Shamal', label: 'Al Shamal' },
  { value: 'Al Shahaniya', label: 'Al Shahaniya' },
  { value: 'Mesaieed', label: 'Mesaieed' },
  { value: 'Dukhan', label: 'Dukhan' },
];

export function placeLabel(value: string): string {
  return QATAR_PLACES.find((place) => place.value === value)?.label ?? value;
}

export { listingsQueryForPlace, placeToBrowsePatch } from './uiPlace';

export function paymentStateLabel(state: string, t: LabelTranslate): string {
  switch (state) {
    case 'awaiting_payment':
      return t('account.order.pay.awaiting_payment');
    case 'paid':
      return t('account.order.pay.paid');
    case 'failed':
      return t('account.order.pay.failed');
    default:
      return state.replaceAll('_', ' ');
  }
}

export function orderSourceLabel(source: string | undefined, t: LabelTranslate): string {
  if (source === 'fixed_price') return t('account.order.source.fixed_price');
  if (source === 'auction') return t('account.order.source.auction');
  return t('account.order.source.default');
}
