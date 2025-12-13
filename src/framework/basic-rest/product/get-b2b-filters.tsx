import { useQuery } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { transformSearchParams } from '@utils/transform/b2b-product';
import {
  RawFacetResult,
  TransformedFilter,
  transformFilterParamsForApi,
  transformFilters,
} from '@utils/transform/b2b-filter';

// ===============================
// Fetch Filters from API
// ===============================

export const fetchAvailableFilters = async (
  params: Record<string, any>,
): Promise<TransformedFilter[]> => {
  const allowedParams = transformFilterParamsForApi(params);
  const finalParams = transformSearchParams(allowedParams);

  const response = await post<{
    facet_results: RawFacetResult;
  }>(API_ENDPOINTS_B2B.FILTER, finalParams);

  return transformFilters(response.facet_results || {});
};

// ===============================
// React Query Hook
// ===============================

export const useFilterQuery = (params: Record<string, any>) => {
  return useQuery<TransformedFilter[], Error>({
    queryKey: ['filters', params],
    queryFn: () => fetchAvailableFilters(params),
  });
};
