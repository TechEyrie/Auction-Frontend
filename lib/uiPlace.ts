import { useEffect, useState } from 'react';

/** Header marketplace place persisted in the browser (catalog city + optional area). */
export const UI_PLACE_STORAGE_KEY = 'araq-ui-place';

export type StoredPlace = { cityKey: string; areaKey: string };

export function readStoredPlace(): StoredPlace | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(UI_PLACE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPlace>;
    if (!parsed.cityKey || typeof parsed.cityKey !== 'string') return null;
    const areaKey = typeof parsed.areaKey === 'string' ? parsed.areaKey : '';
    return { cityKey: parsed.cityKey, areaKey };
  } catch {
    return null;
  }
}

export function writeStoredPlace(place: StoredPlace | null): void {
  if (typeof window === 'undefined') return;
  if (!place?.cityKey) window.localStorage.removeItem(UI_PLACE_STORAGE_KEY);
  else window.localStorage.setItem(UI_PLACE_STORAGE_KEY, JSON.stringify(place));
}

export function catalogPlaceOptionKey(cityKey: string, areaKey: string | null): string {
  return areaKey ? `${cityKey}:${areaKey}` : cityKey;
}

export function parseCatalogPlaceOptionKey(value: string): StoredPlace | null {
  if (!value) return null;
  const colon = value.indexOf(':');
  if (colon < 0) return { cityKey: value, areaKey: '' };
  return { cityKey: value.slice(0, colon), areaKey: value.slice(colon + 1) };
}

export function placeToBrowsePatch(place: StoredPlace | null): { city: string; area: string } {
  if (!place?.cityKey) return { city: '', area: '' };
  return { city: place.cityKey, area: place.areaKey };
}

export function listingsQueryForPlace(place: StoredPlace | null): string {
  if (!place?.cityKey) return '';
  const params = new URLSearchParams();
  params.set('city', place.cityKey);
  if (place.areaKey) params.set('area', place.areaKey);
  return params.toString();
}

export function appendPlaceQuery(base: string): string {
  const qs = listingsQueryForPlace(readStoredPlace());
  if (!qs) return base;
  return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`;
}

/** Client-only stored marketplace place (re-read on mount). */
export function useUiPlace(): StoredPlace | null {
  const [place, setPlace] = useState<StoredPlace | null>(null);
  useEffect(() => {
    setPlace(readStoredPlace());
  }, []);
  return place;
}

export function useUiPlaceQueryKey(): string {
  const place = useUiPlace();
  if (!place) return '';
  return place.areaKey ? `${place.cityKey}:${place.areaKey}` : place.cityKey;
}
