import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Product } from '@framework/types';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import { post } from '@framework/utils/httpPIM';
import type {
  PimProduct,
  PimProductAttribute,
  PimSearchResponse,
} from 'vinc-pim';

// ===============================
// Transform PIM product to internal Product type
// ===============================
function transformPimProduct(raw: PimProduct): Product {
  // Extract model from attributes if not directly available
  // Handle both array format and multilingual object format
  let modelAttr: PimProductAttribute | undefined;
  if (Array.isArray(raw.attributes)) {
    modelAttr = raw.attributes.find((a) => a.key === 'descrizione-tecnica');
  } else if (raw.attributes && typeof raw.attributes === 'object') {
    // Multilingual format: { it: { key: { key, label, value } } }
    const langAttrs =
      (raw.attributes as any)?.it || Object.values(raw.attributes)[0];
    if (langAttrs && typeof langAttrs === 'object') {
      modelAttr = langAttrs['descrizione-tecnica'];
    }
  }
  const model = raw.product_model || modelAttr?.value || '';

  return {
    id: raw.entity_code || raw.id || '', // Prefer entity_code for ERP compatibility
    sku: raw.sku || '',
    name: raw.name || '',
    slug: raw.slug || raw.sku?.toLowerCase() || '',
    // short_description is for display anywhere, description is HTML for product detail only
    description: raw.short_description || '',
    html_description: raw.description || '', // HTML content for product detail tab
    image: {
      id: raw.image?.id || '',
      thumbnail:
        raw.image?.thumbnail ||
        raw.cover_image_url ||
        raw.images?.[0]?.url ||
        '',
      original:
        raw.image?.original ||
        raw.cover_image_url ||
        raw.images?.[0]?.url ||
        '',
    },
    gallery:
      raw.images?.map((img) => ({
        id: img.url,
        thumbnail: img.url,
        original: img.url,
      })) || [],
    quantity: raw.quantity || 0,
    unit: raw.unit || 'pcs',
    price: 0, // Price comes from ERP
    sale_price: 0,
    product_type: 'simple',
    brand: raw.brand
      ? {
          id: raw.brand.brand_id || '',
          name: raw.brand.label || raw.brand.slug || '',
          slug: raw.brand.slug || '',
          image: raw.brand.logo_url
            ? {
                id: '',
                thumbnail: raw.brand.logo_url,
                original: raw.brand.logo_url,
              }
            : undefined,
          logo_url: raw.brand.logo_url,
          brand_id: raw.brand.brand_id,
          label: raw.brand.label,
        }
      : undefined,
    model: model,
    parent_sku: raw.parent_sku || raw.parent_entity_code || '',
    // Map API variants to frontend variations
    variations: Array.isArray(raw.variants)
      ? raw.variants.map((v) => transformPimProduct(v))
      : [],
    tag: [],
    category: { id: '', name: '', slug: '' },
    sold: 0,
    // Pass through media for documents, videos, 3D models
    media: raw.media || [],
    // Pass through attributes for technical specifications
    attributes: raw.attributes || {},
    // Pass through promo data (for parent products, check if any variant has promo)
    has_active_promo:
      raw.has_active_promo ??
      raw.variants?.some((v) => v.has_active_promo) ??
      false,
    promotions:
      raw.promotions || raw.variants?.flatMap((v) => v.promotions || []) || [],
    // Pass through marketing and technical specs
    marketing_features: raw.marketing_features || {},
    technical_specifications: raw.technical_specifications || {},
  } as Product;
}

function transformPimProducts(products: PimProduct[]): Product[] {
  return products.map(transformPimProduct);
}

// ===============================
// Legacy to PIM field name mapping
// ===============================
const LEGACY_TO_PIM_FIELD: Record<string, string> = {
  id_brand: 'brand_id',
  promo_type: 'promo_type',
  new: 'attribute_is_new_b',
  is_new: 'attribute_is_new_b',
  promo_codes: 'promo_code',
  category: 'category_ancestors',
  family: 'category_ancestors',
};

function mapFilterKeys(filters: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    const pimKey = LEGACY_TO_PIM_FIELD[key] || key;
    mapped[pimKey] = value;
  }
  return mapped;
}

// ===============================
// Types for grouped results
// ===============================
export interface ProductGroup {
  groupValue: string; // Parent entity code
  numFound: number; // Total variants in this group
  products: Product[]; // Products in this group (transformed)
}

export interface GroupedSearchResult {
  items: Product[]; // Flat array (backwards compatible)
  total: number;
  grouped?: {
    field: string;
    ngroups: number; // Total unique parent products
    matches: number; // Total matching variants
    groups: ProductGroup[];
  };
}

// ===============================
// Extended Product type with variant count (for grouped results)
// ===============================
export interface ProductWithVariantCount extends Product {
  variantCount?: number; // Number of variants in this group (from grouping)
}

// ===============================
// Fetch function for PIM search (POST) via proxy (credentials injected server-side)
// ===============================
export const fetchPimProductList = async (
  params: Record<string, any>,
): Promise<GroupedSearchResult> => {
  // Build filters object - map legacy field names to PIM field names
  const rawFilters = params.filters || {};
  const filters: Record<string, any> = mapFilterKeys(rawFilters);

  // Also extract filters from URL-style params (e.g., filters-brand_id=MOB)
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('filters-') && value) {
      const filterKey = key.replace('filters-', '');
      const pimKey = LEGACY_TO_PIM_FIELD[filterKey] || filterKey;
      filters[pimKey] = value;
    }
  }

  // Build POST body matching PIM API structure
  const body: Record<string, any> = {
    lang: params.lang || 'it',
    text: params.q || params.text || '',
    start: params.start || 0,
    rows: params.rows || params.limit || params.per_page || 12,
  };

  // Only add filters if there are any
  if (Object.keys(filters).length > 0) {
    body.filters = filters;
  }

  // Add facet_fields if provided
  if (params.facet_fields) {
    body.facet_fields = params.facet_fields;
  }

  // Add group_variants for variant grouping (API returns variants array inline)
  if (params.group_variants) {
    body.group_variants = true;
  }

  // Use proxy - credentials are injected server-side
  const data = await post<PimSearchResponse>(API_ENDPOINTS_PIM.SEARCH, body);

  if (!data.success) {
    throw new Error('PIM search returned unsuccessful response');
  }

  const products = transformPimProducts(data.data.results || []);
  // Use numFound (Solr) or total (legacy) - fallback to products.length only as last resort
  const total = data.data.numFound ?? data.data.total ?? products.length;

  // Build result with optional grouped data
  const result: GroupedSearchResult = {
    items: products,
    total,
  };

  // Transform grouped response if present
  if (data.data.grouped) {
    result.grouped = {
      field: data.data.grouped.field,
      ngroups: data.data.grouped.ngroups,
      matches: data.data.grouped.matches,
      groups: data.data.grouped.groups.map((g) => ({
        groupValue: g.groupValue,
        numFound: g.numFound,
        products: transformPimProducts(g.docs),
      })),
    };
  }

  return result;
};

// ===============================
// React Query hook for PIM products
// ===============================
export const usePimProductListQuery = (
  params: Record<string, any>,
  options?: { enabled?: boolean; groupByParent?: boolean },
) => {
  const enabled = options?.enabled ?? true;
  const groupByParent = options?.groupByParent ?? false;

  // Memoize params to prevent unnecessary re-fetches
  const stableParams = useMemo(() => {
    if (!enabled) return {};
    const baseParams = { ...params };

    // Add group_variants for variant grouping (API returns variants array inline)
    if (groupByParent) {
      baseParams.group_variants = true;
    }

    return baseParams;
  }, [JSON.stringify(params), enabled, groupByParent]);

  const query = useQuery<ProductWithVariantCount[], Error>({
    queryKey: ['pim-search', stableParams],
    queryFn: async () => {
      const result = await fetchPimProductList(stableParams);
      // Add variantCount based on variations.length for consistency with infinite query
      return result.items.map((p) => ({
        ...p,
        variantCount: p.variations?.length || 1,
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};

// ===============================
// Infinite Query hook for PIM products (pagination support)
// ===============================
export const usePimProductListInfiniteQuery = (
  params: Record<string, any>,
  options?: { groupByParent?: boolean },
) => {
  const perPage = params.per_page || params.rows || 24;
  const groupByParent = options?.groupByParent ?? false;

  // Build stable params without pagination
  const baseParams = useMemo(() => {
    const { start, rows, per_page, ...rest } = params;

    // Add group_variants for variant grouping (API returns variants array inline)
    if (groupByParent) {
      rest.group_variants = true;
    }

    return rest;
  }, [JSON.stringify(params), groupByParent]);

  return useInfiniteQuery({
    queryKey: ['pim-search-infinite', baseParams, perPage, groupByParent],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await fetchPimProductList({
        ...baseParams,
        start: pageParam * perPage,
        rows: perPage,
      });

      // When group_variants=true, each product has variants array
      // variantCount = variations.length (already transformed from API variants)
      const items: ProductWithVariantCount[] = result.items.map((p) => ({
        ...p,
        variantCount: p.variations?.length || 1,
      }));

      const hasNext = (pageParam + 1) * perPage < result.total;

      return {
        items,
        total: result.total,
        nextPage: hasNext ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===============================
// React Query hook for grouped PIM products (group by parent)
// ===============================
export const usePimGroupedProductListQuery = (
  params: Record<string, any>,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;

  // Memoize params to prevent unnecessary re-fetches
  const stableParams = useMemo(() => {
    if (!enabled) return {};
    // Add group_variants for variant grouping
    return {
      ...params,
      group_variants: true,
    };
  }, [JSON.stringify(params), enabled]);

  const query = useQuery<GroupedSearchResult, Error>({
    queryKey: ['pim-search-grouped', stableParams],
    queryFn: async () => {
      return await fetchPimProductList(stableParams);
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};
