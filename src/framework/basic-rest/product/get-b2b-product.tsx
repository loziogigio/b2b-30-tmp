import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Product } from '@framework/types';
import { transformProduct, RawProduct, transformSearchParams } from '@utils/transform/b2b-product';

// ===============================
// 1. Fetch function with pagination
// ===============================
export const fetchProductList = async (
  params: any,
  pageParam: number = 0
): Promise<{
  items: Product[];
  total: number;
  nextPage: number | null;
}> => {
  const perPage = params.per_page || 12;

  // Adjust backend params to request correct offset/limit
  const finalParams = {
    ...params,
    start: pageParam , // ✅ pageParam now acts like a page index
    rows: perPage, // if your backend supports it
  };

  const response = await post<{ results: RawProduct[]; numFound: number }>(
    API_ENDPOINTS_B2B.SEARCH,
    finalParams
  );

  const rawProducts = response.results || [];
  const products = transformProduct(rawProducts);
  const total = response.numFound || 0;

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
export const useProductListQuery = (params: any, options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;

  // Transform params once, stably - use JSON.stringify for deep comparison
  const finalParams = useMemo(() => {
    if (!enabled) return {};
    return transformSearchParams(params);
  }, [JSON.stringify(params), enabled]);

  const query = useQuery<Product[], Error>({
    queryKey: [API_ENDPOINTS_B2B.SEARCH, finalParams],
    queryFn: async () => {
      const { items } = await fetchProductList(finalParams, 0);
      return items;
    },
    enabled
  });

  return query;
};

// ===============================
// 3. Infinite query with pagination support
// ===============================
export const useProductListInfinitQuery = (params: any) => {
  const finalParams = transformSearchParams(params);

  return useInfiniteQuery({
    queryKey: [API_ENDPOINTS_B2B.SEARCH, finalParams],
    queryFn: async ({ pageParam = 0 }) =>
      fetchProductList(finalParams, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 0
  });
};
