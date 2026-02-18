import { useQuery } from '@tanstack/react-query';
import { get } from '@framework/utils/httpPIM';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import type { CorrelationsResponse } from 'vinc-pim';

// Re-export types for consumers that import from this file
export type {
  CorrelatedProduct,
  Correlation,
  CorrelationsResponse,
} from 'vinc-pim';

// Fetch correlations for a product via proxy (credentials injected server-side)
export async function fetchCorrelations(
  entityCode: string,
  options?: { type?: string; limit?: number },
): Promise<CorrelationsResponse> {
  try {
    const result = await get<CorrelationsResponse>(
      API_ENDPOINTS_PIM.CORRELATIONS,
      {
        source_entity_code: entityCode,
        correlation_type: options?.type || 'related',
        limit: options?.limit || 20,
      },
    );
    return result;
  } catch {
    // Return empty correlations on error (product may have no correlations)
    return {
      correlations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }
}

// React Query hook for correlations
export function useCorrelationsQuery(
  entityCode: string | undefined,
  options?: { type?: string; limit?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['correlations', entityCode, options?.type, options?.limit],
    queryFn: () => fetchCorrelations(entityCode!, options),
    enabled: !!entityCode && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
