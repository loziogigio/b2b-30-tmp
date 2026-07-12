import { getTrendingProductsPage, getUserLikes } from '@framework/likes';
import { getUserReminders } from '@framework/reminders';

export type SpecialSource = 'likes' | 'reminders' | 'trending';

export interface SpecialSourceSkuPage {
  skus: string[];
  hasNext: boolean;
  totalCount: number;
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

export async function fetchSpecialSourceSkuPage({
  source,
  period,
  page,
  pageSize,
}: {
  source: SpecialSource;
  period: string;
  page: number;
  pageSize: number;
}): Promise<SpecialSourceSkuPage> {
  if (source === 'likes') {
    const res = await getUserLikes(page, pageSize);
    return {
      skus: (res?.likes || []).map((like: any) => like.sku).filter(Boolean),
      hasNext: !!res?.has_next,
      totalCount: res?.total_count ?? 0,
    };
  }

  if (source === 'reminders') {
    const res = await getUserReminders(page, pageSize);
    return {
      skus: (res?.reminders || [])
        .map((reminder: any) => reminder.sku)
        .filter(Boolean),
      hasNext: !!res?.has_next,
      totalCount: res?.total_count ?? 0,
    };
  }

  const res = await getTrendingProductsPage(period, page, pageSize);
  return {
    skus: (res?.items || []).map((item: any) => item.sku).filter(Boolean),
    hasNext: !!res?.has_next,
    totalCount: res?.total_count ?? 0,
  };
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
