/** Minimal category shape for shopper drill-down (matches public catalog API fields used in UI). */
export type CatalogCategory = {
  key: string;
  parentKey: string | null;
  name: string;
  order?: number;
};

function byOrder<T extends CatalogCategory>(a: T, b: T): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

export function categoryRoots<T extends CatalogCategory>(cats: T[]): T[] {
  return cats.filter((c) => c.parentKey === null).sort(byOrder);
}

export function categoryChildren<T extends CatalogCategory>(cats: T[], parentKey: string): T[] {
  return cats.filter((c) => c.parentKey === parentKey).sort(byOrder);
}

export function categoryByKey<T extends CatalogCategory>(cats: T[], key: string): T | undefined {
  return cats.find((c) => c.key === key);
}
