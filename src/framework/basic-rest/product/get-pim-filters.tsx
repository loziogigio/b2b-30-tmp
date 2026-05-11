import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import { post } from '@framework/utils/httpPIM';
import {
  PIM_FACET_FIELDS,
  PIM_FACET_LABELS,
  STOCK_STATUS_LABELS,
  BOOLEAN_LABELS,
} from '@framework/utils/filters';
import { resolveSupportedLang } from '@/app/i18n/settings';
import type {
  PimFacetEntity,
  PimFacetValue,
  PimFacetResponse,
  PimFilterValue,
  PimTransformedFilter,
} from 'vinc-pim';

// Re-export for consumers that import from this file
export type { PimFilterValue, PimTransformedFilter } from 'vinc-pim';

// Filter key pass-through (no legacy mapping needed)
function mapFilterKey(key: string): string {
  return key;
}

// ===============================
// Resolve labels for special fields
// ===============================
function resolveLabel(
  field: string,
  value: string,
  apiLabel?: string,
  promoTypeMap?: Record<string, string>,
): string {
  // promo_type: prefer the harvested human label (e.g. "LIP" → "LIFE IN POOL")
  // when we have one; the PIM facet itself ships the bare code without a
  // user-friendly label.
  if (field === 'promo_type') {
    if (promoTypeMap && promoTypeMap[value]) return promoTypeMap[value];
    if (apiLabel && apiLabel.trim() !== '' && apiLabel !== value) {
      return apiLabel;
    }
    return value;
  }

  // Use API label if provided and not empty (backend enriches product_type_code labels)
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
// Harvest spec UoMs from per-product technical_specifications.
// PIM available-specs may ship uom:null while individual products carry
// the unit on each spec entry — this scan covers that fallback so spec
// facet values still render with "30 cm" instead of bare "30".
// ===============================
function harvestSpecUoms(docs: any[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(docs)) return map;
  for (const doc of docs) {
    const list = Array.isArray(doc?.technical_specifications)
      ? doc.technical_specifications
      : [];
    for (const s of list) {
      const key = s?.key;
      const uom =
        typeof s?.uom === 'string'
          ? s.uom
          : (s?.uom && (s.uom as any).symbol) || '';
      if (!key || !uom) continue;
      const field = `spec_${key}_s`;
      if (!map[field]) map[field] = String(uom).trim();
    }
  }
  return map;
}

// ===============================
// Harvest promo_type code → label map from product docs.
// PIM facet returns the bare code (e.g. "LIP") with no friendly label, but
// products carry promotions[] with both `promo_type` and a `label`/`name`.
// Mirrors the dfl-b2b server-side enrichment.
// ===============================
function harvestPromoTypeLabels(
  docs: any[] | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(docs)) return map;
  for (const doc of docs) {
    const proms = Array.isArray(doc?.promotions) ? doc.promotions : [];
    for (const p of proms) {
      const code = p?.promo_type;
      const label = p?.label || p?.name;
      if (code && label && !map[code]) map[code] = label;
    }
  }
  return map;
}

// ===============================
// Transform PIM facets to UI format
// ===============================
function transformPimFacets(
  facetResults: Record<string, PimFacetValue[]>,
  lang: string = 'it',
  specUomMap: Record<string, string> = {},
  promoTypeMap: Record<string, string> = {},
): PimTransformedFilter[] {
  if (!facetResults || typeof facetResults !== 'object') return [];

  const transformed: PimTransformedFilter[] = [];

  for (const field of Object.keys(facetResults)) {
    let facetGroup = facetResults[field];
    if (!Array.isArray(facetGroup) || facetGroup.length === 0) continue;

    // Drop level-0 "Categoria Root" entries from category_ancestors — roots
    // are channel-bound containers in the PIM, not navigable categories,
    // so they shouldn't appear in the storefront cascade.
    if (field === 'category_ancestors') {
      facetGroup = facetGroup.filter((f: any) => f?.entity?.level !== 0);
      if (facetGroup.length === 0) continue;
    }

    transformed.push({
      key: field,
      // Local labels win over the API's `key_label` for known facets so we
      // can rename / translate (e.g. PROMO_TYPE → "Promozione") without a
      // backend round-trip.
      label: PIM_FACET_LABELS[field] || facetGroup[0]?.key_label || field,
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

        const resolved = resolveLabel(field, f.value, label, promoTypeMap);
        // Append harvested UoM for spec_* fields (idempotent — won't double-suffix).
        const uom = field.startsWith('spec_') ? specUomMap[field] : '';
        const finalLabel =
          uom && !String(resolved).endsWith(` ${uom}`)
            ? `${resolved} ${uom}`
            : resolved;
        return {
          value: f.value,
          label: finalLabel,
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
// Fetch PIM facets via proxy (credentials injected server-side)
// ===============================
export const fetchPimFilters = async (
  params: Record<string, any>,
): Promise<PimTransformedFilter[]> => {
  // Build filters from URL params (filters-xxx -> filters.xxx)
  const filters: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('filters-')) {
      const legacyKey = key.replace('filters-', '');
      // Map legacy field names to PIM field names
      const filterKey = mapFilterKey(legacyKey);
      // Support semicolon-separated values
      filters[filterKey] =
        typeof value === 'string' && value.includes(';')
          ? value.split(';')
          : value;
    }
  }

  // Build POST body - use search endpoint with include_faceting.
  // We pull a tiny page of products (rows: 5) so we can harvest UoM symbols
  // from their technical_specifications[].uom — the /available-specs endpoint
  // may ship uom:null on some tenants and the products are the only fallback.
  const body: Record<string, any> = {
    lang: resolveSupportedLang(params.lang),
    rows: 5,
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

  // Use proxy - credentials are injected server-side
  const data = await post<PimFacetResponse>(API_ENDPOINTS_PIM.SEARCH, body);

  // Handle response formats: { success, data: { facet_results } } or { facet_results }
  const facetResults = data.data?.facet_results || data.facet_results || {};
  const docs = (data as any).data?.results || (data as any).results || [];
  const specUomMap = harvestSpecUoms(docs);
  const lang = body.lang || 'it';

  // Promo-type labels: the PIM proxy enriches facet_results.promo_type with
  // friendly labels (mirrors dfl-b2b's server-side getPromoTypeMap). We still
  // run the local harvest as a fast path in case proxy enrichment is bypassed
  // (e.g. tests, direct PIM hits) — both paths feed the same resolveLabel.
  const promoTypeMap = harvestPromoTypeLabels(docs);

  return transformPimFacets(facetResults, lang, specUomMap, promoTypeMap);
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
