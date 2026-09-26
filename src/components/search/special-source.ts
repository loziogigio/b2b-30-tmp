import { getTrendingProductsPage, getUserLikes } from '@framework/likes';
import { getUserReminders } from '@framework/reminders';
import type { ListProductSnapshot } from '@framework/types';

export type SpecialSource = 'likes' | 'reminders' | 'trending';

/** The lists a customer saves products into (as opposed to trending). */
export type SavedListSource = Extract<SpecialSource, 'likes' | 'reminders'>;

export interface SpecialSourceSkuPage {
  skus: string[];
  hasNext: boolean;
  totalCount: number;
  /** How each saved product looked, by SKU; filled on `includeProduct`. */
  products: Record<string, ListProductSnapshot>;
}

/** A saved product the catalog search no longer returns. */
export interface UnavailableListItem {
  unavailable: true;
  sku: string;
  product?: ListProductSnapshot;
}

export function getSpecialSource(
  value: string | null | undefined,
): SpecialSource | null {
  const source = String(value ?? '').toLowerCase();
  if (source === 'likes' || source === 'reminders' || source === 'trending') {
    return source;
  }
  return null;
}

export function isSavedListSource(
  source: SpecialSource | null,
): source is SavedListSource {
  return source === 'likes' || source === 'reminders';
}

export function isUnavailableListItem(
  item: unknown,
): item is UnavailableListItem {
  return (item as UnavailableListItem | null)?.unavailable === true;
}

export function canLoadSpecialSource(
  source: SpecialSource | null,
  isAuthorized: boolean,
): boolean {
  if (!source) return false;
  return source === 'trending' || isAuthorized;
}

export function parsePimFiltersFromUrlParams(
  urlParams: Record<string, string>,
  options?: { collectionSlug?: string },
): Record<string, any> {
  const filters: Record<string, any> = {};

  for (const [key, value] of Object.entries(urlParams)) {
    if (!key.startsWith('filters-')) continue;
    const filterKey = key.replace('filters-', '');
    filters[filterKey] =
      typeof value === 'string' && value.includes(';')
        ? value.split(';')
        : value;
  }

  if (options?.collectionSlug) {
    filters.collection_slugs = options.collectionSlug;
  }

  return filters;
}

export function buildSkuFilterParams(skus: string[] | undefined) {
  if (!skus?.length) return {};
  return { 'filters-sku': skus.join(';') };
}

function productsBySku(
  entries: { sku?: string; product?: ListProductSnapshot }[],
): Record<string, ListProductSnapshot> {
  const products: Record<string, ListProductSnapshot> = {};
  for (const entry of entries) {
    if (entry?.sku && entry.product) products[entry.sku] = entry.product;
  }
  return products;
}

export async function fetchSpecialSourceSkuPage({
  source,
  period,
  page,
  pageSize,
  includeProduct = false,
}: {
  source: SpecialSource;
  period: string;
  page: number;
  pageSize: number;
  /** Saved lists only: also fetch how each product looked. */
  includeProduct?: boolean;
}): Promise<SpecialSourceSkuPage> {
  if (source === 'likes') {
    const res = await getUserLikes(page, pageSize, { includeProduct });
    const likes = res?.likes || [];
    return {
      skus: likes.map((like: any) => like.sku).filter(Boolean),
      hasNext: !!res?.has_next,
      totalCount: res?.total_count ?? 0,
      products: productsBySku(likes),
    };
  }

  if (source === 'reminders') {
    // Only the reminders still waiting to fire, as the header badge counts.
    const res = await getUserReminders(page, pageSize, undefined, 'active', {
      includeProduct,
    });
    const reminders = res?.reminders || [];
    return {
      skus: reminders.map((reminder: any) => reminder.sku).filter(Boolean),
      hasNext: !!res?.has_next,
      totalCount: res?.total_count ?? 0,
      products: productsBySku(reminders),
    };
  }

  const res = await getTrendingProductsPage(period, page, pageSize);
  return {
    skus: (res?.items || []).map((item: any) => item.sku).filter(Boolean),
    hasNext: !!res?.has_next,
    totalCount: res?.total_count ?? 0,
    products: {},
  };
}

/**
 * The search results in saved order, with a placeholder for each saved SKU the
 * search no longer returns: a product removed from the catalog stays in the
 * list, greyed out, until the customer removes it. Results that match no saved
 * SKU are kept after the saved ones.
 */
export function withUnavailableItems<T extends { sku?: string }>(
  skus: string[],
  items: T[],
  products: Record<string, ListProductSnapshot>,
): Array<T | UnavailableListItem> {
  const bySku = new Map<string, T>();
  for (const item of items) {
    const key = item?.sku?.toLowerCase();
    if (key && !bySku.has(key)) bySku.set(key, item);
  }

  const placed = new Set<T>();
  const ordered: Array<T | UnavailableListItem> = [];
  for (const sku of skus) {
    const item = bySku.get(sku.toLowerCase());
    if (!item) {
      const product = products[sku];
      ordered.push({ unavailable: true, sku, ...(product ? { product } : {}) });
    } else if (!placed.has(item)) {
      placed.add(item);
      ordered.push(item);
    }
  }

  return [...ordered, ...items.filter((item) => !placed.has(item))];
}

export async function fetchSpecialSourceSkus({
  source,
  period,
  maxPages = 5,
  pageSize = 100,
}: {
  source: SpecialSource;
  period: string;
  maxPages?: number;
  pageSize?: number;
}): Promise<string[]> {
  const skus: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const result = await fetchSpecialSourceSkuPage({
      source,
      period,
      page,
      pageSize,
    });
    skus.push(...result.skus);
    if (!result.hasNext) break;
  }

  return Array.from(new Set(skus));
}
