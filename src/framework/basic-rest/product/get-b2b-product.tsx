import { post } from '@framework/utils/httpPIM';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Product } from '@framework/types';
import {
  transformProduct,
  RawProduct,
  transformSearchParams,
} from '@utils/transform/b2b-product';

// ===============================
// 1. Fetch function with pagination
// ===============================
export const fetchProductList = async (
  params: any,
  pageParam: number = 0,
): Promise<{
  items: Product[];
  total: number;
  nextPage: number | null;
}> => {
  const perPage = params.per_page || params.rows || 12;

  // Build POST body matching PIM API structure (same as fetchPimProductList)
  const finalParams: Record<string, any> = {
    lang: params.lang || 'it',
    text: params.q || params.text || '',
    start: pageParam,
    rows: perPage,
    group_variants: true,
  };

  // Only add filters if there are any (PIM API doesn't like empty filters)
  const rawFilters = params.filters || {};
  if (Object.keys(rawFilters).length > 0) {
    finalParams.filters = rawFilters;
  }

  console.log(
    '[fetchProductList] Sending to PIM:',
    JSON.stringify(finalParams, null, 2),
  );

  // PIM API wraps response in { success, data: { results, numFound } }
  const response = await post<{
    success?: boolean;
    data?: { results: RawProduct[]; numFound?: number; total?: number };
    results?: RawProduct[];
    numFound?: number;
  }>(API_ENDPOINTS_PIM.SEARCH, finalParams);

  console.log(
    '[fetchProductList] PIM response:',
    JSON.stringify(response, null, 2).slice(0, 500),
  );

  // Handle both wrapped { success, data } and direct { results, numFound } formats
  const rawProducts = response.data?.results || response.results || [];
  const total =
    response.data?.numFound ?? response.data?.total ?? response.numFound ?? 0;
  const products = transformProduct(rawProducts);

  // Calculate if there is a next page
  const hasNext = (pageParam + 1) * perPage < total;

  return {
    items: products,
    total,
    nextPage: hasNext ? pageParam + 1 : null,
  };
};

// ===============================
// 2. Simple paginated (single-shot) query
// ===============================
export const useProductListQuery = (
  params: any,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;

  // Transform params once, stably - use JSON.stringify for deep comparison
  const finalParams = useMemo(() => {
    if (!enabled) return {};
    return transformSearchParams(params);
  }, [JSON.stringify(params), enabled]);

  const query = useQuery<Product[], Error>({
    queryKey: [API_ENDPOINTS_PIM.SEARCH, finalParams],
    queryFn: async () => {
      const { items } = await fetchProductList(finalParams, 0);
      return items;
    },
    enabled,
  });

  return query;
};

// ===============================
// 3. Infinite query with pagination support
// ===============================
export const useProductListInfinitQuery = (params: any) => {
  const finalParams = transformSearchParams(params);

  return useInfiniteQuery({
    queryKey: [API_ENDPOINTS_PIM.SEARCH, finalParams],
    queryFn: async ({ pageParam = 0 }) =>
      fetchProductList(finalParams, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 0,
  });
};
