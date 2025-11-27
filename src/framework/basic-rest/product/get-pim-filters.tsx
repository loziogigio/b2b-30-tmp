import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS_PIM, PIM_API_BASE_URL } from '@framework/utils/api-endpoints-pim';
import {
  PIM_FACET_FIELDS,
  PIM_FACET_LABELS,
  STOCK_STATUS_LABELS,
  BOOLEAN_LABELS
} from '@framework/utils/filters';

// ===============================
// Types for PIM Facet API
// ===============================
interface PimFacetEntity {
  brand_id?: string;
  category_id?: string;
  label?: string | Record<string, string>;
  slug?: string;
  logo_url?: string;
  is_active?: boolean;
  product_count?: number;
  [key: string]: any;
}

interface PimFacetValue {
  value: string;
  count: number;
  label: string;
  key_label: string;
  level?: number;
  parent_id?: string;
  path?: string;
  entity?: PimFacetEntity;
}

interface PimFacetResponse {
  success: boolean;
  data?: {
    facet_results: {
      [field: string]: PimFacetValue[];
    };
  };
  facet_results?: {
    [field: string]: PimFacetValue[];
  };
}

// Transformed filter value for UI
export interface PimFilterValue {
  value: string;
  label: string;
  count: number;
  logo_url?: string;
  entity?: PimFacetEntity;
}

// Transformed filter for UI
export interface PimTransformedFilter {
  key: string;
  label: string;
  values: PimFilterValue[];
}

// ===============================
// Legacy to PIM field name mapping
// ===============================
const LEGACY_TO_PIM_FIELD: Record<string, string> = {
  'id_brand': 'brand_id',
  'promo_type': 'promo_type',
  'new': 'attribute_is_new_b',
  'is_new': 'attribute_is_new_b',
  'promo_codes': 'promo_code',
  'category': 'category_ancestors',
  'family': 'category_ancestors',
};

function mapFilterKey(key: string): string {
  return LEGACY_TO_PIM_FIELD[key] || key;
}

// ===============================
// Resolve labels for special fields
// ===============================
function resolveLabel(field: string, value: string, apiLabel?: string): string {
  // Use API label if provided and not empty
  if (apiLabel && apiLabel.trim() !== '') {
    return apiLabel;
  }

  // Stock status special handling
  if (field === 'stock_status') {
    return STOCK_STATUS_LABELS[value] || value;
  }

  // Boolean fields (has_active_promo, attribute_is_new_b)
  if (field === 'has_active_promo' || field === 'attribute_is_new_b') {
    return BOOLEAN_LABELS[value] || value;
  }

  return value;
}

// ===============================
// Transform PIM facets to UI format
// ===============================
function transformPimFacets(facetResults: Record<string, PimFacetValue[]>, lang: string = 'it'): PimTransformedFilter[] {
  if (!facetResults || typeof facetResults !== 'object') return [];

  const transformed: PimTransformedFilter[] = [];

  for (const field of Object.keys(facetResults)) {
    const facetGroup = facetResults[field];
    if (!Array.isArray(facetGroup) || facetGroup.length === 0) continue;

    transformed.push({
      key: field,
      label: facetGroup[0]?.key_label || PIM_FACET_LABELS[field] || field,
      values: facetGroup.map((f) => {
        // Extract label from entity if available (supports multilingual)
        let label = f.label;
        if (f.entity?.label) {
          if (typeof f.entity.label === 'string') {
            label = f.entity.label;
          } else if (typeof f.entity.label === 'object') {
            label = f.entity.label[lang] || f.entity.label['it'] || f.label;
          }
        }

        return {
          value: f.value,
          label: resolveLabel(field, f.value, label),
          count: f.count,
          logo_url: f.entity?.logo_url,
          entity: f.entity,
        };
      }),
    });
  }

  return transformed;
}

// ===============================
// Fetch PIM facets (using search endpoint with include_faceting)
// ===============================
export const fetchPimFilters = async (
  params: Record<string, any>
): Promise<PimTransformedFilter[]> => {
  // Use search endpoint with include_faceting instead of separate facet endpoint
  const url = `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.SEARCH}`;

  // Build filters from URL params (filters-xxx -> filters.xxx)
  const filters: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('filters-')) {
      const legacyKey = key.replace('filters-', '');
      // Map legacy field names to PIM field names
      const filterKey = mapFilterKey(legacyKey);
      // Support semicolon-separated values
      filters[filterKey] = typeof value === 'string' && value.includes(';')
        ? value.split(';')
        : value;
    }
  }

  // Build POST body - use search endpoint with include_faceting
  const body: Record<string, any> = {
    lang: params.lang || 'it',
    rows: 0, // Don't need results, just facets
    include_faceting: true,
    facet_fields: params.facet_fields || PIM_FACET_FIELDS,
  };

  // Add text search if provided
  if (params.text) {
    body.text = params.text;
  }

  // Add filters if any
  if (Object.keys(filters).length > 0) {
    body.filters = filters;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PIM facet fetch failed: ${response.statusText}`);
  }

  const data: PimFacetResponse = await response.json();

  // Handle response formats: { success, data: { facet_results } } or { facet_results }
  const facetResults = data.data?.facet_results || data.facet_results || {};
  const lang = body.lang || 'it';

  return transformPimFacets(facetResults, lang);
};

// ===============================
// React Query hook for PIM filters
// ===============================
export const usePimFilterQuery = (params: Record<string, any>) => {
  return useQuery<PimTransformedFilter[], Error>({
    queryKey: ['pim-filters', params],
    queryFn: () => fetchPimFilters(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
