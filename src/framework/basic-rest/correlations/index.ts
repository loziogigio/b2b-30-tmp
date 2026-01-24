import { useQuery } from '@tanstack/react-query';
import { get } from '@framework/utils/httpPIM';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';

// Types for correlation API response
export interface CorrelatedProduct {
  entity_code: string;
  sku: string;
  name: Record<string, string>; // { it: "...", en: "..." }
  cover_image_url?: string;
  price?: number;
}

export interface Correlation {
  correlation_id: string;
  source_entity_code: string;
  target_entity_code: string;
  correlation_type: 'related' | 'accessory' | 'alternative' | 'spare_part';
  source_product: CorrelatedProduct;
  target_product: CorrelatedProduct;
  position: number;
  is_bidirectional: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CorrelationsResponse {
  correlations: Correlation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
