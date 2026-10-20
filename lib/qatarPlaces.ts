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

export function paymentStateLabel(state: string): string {
  switch (state) {
    case 'awaiting_payment':
      return 'Awaiting payment';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Payment failed';
    default:
      return state.replaceAll('_', ' ');
  }
}

export function orderSourceLabel(source: string | undefined): string {
  if (source === 'fixed_price') return 'Buy now';
  if (source === 'auction') return 'Auction win';
  return 'Purchase';
}
