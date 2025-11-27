import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Product } from '@framework/types';
import { API_ENDPOINTS_PIM, PIM_API_BASE_URL } from '@framework/utils/api-endpoints-pim';

// ===============================
// Types for PIM API response
// ===============================
interface PimProductImage {
  id?: string;
  thumbnail?: string;
  medium?: string;
  large?: string;
  original?: string;
}

interface PimProductBrand {
  brand_id?: string;
  label?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
  logo_url?: string;
}

interface PimProductAttribute {
  key: string;
  label: string;
  value: string;
  order?: number;
}

interface PimMediaItem {
  type: 'document' | 'video' | '3d-model' | string;
  url: string;
  label?: string;
  file_type?: string;
  is_external_link?: boolean;
  position?: number;
}

interface PimProduct {
  id: string;
  sku: string;
  entity_code?: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  quantity?: number;
  unit?: string;
  image?: PimProductImage;
  images?: Array<{ url: string }>;
  brand?: PimProductBrand;
  attributes?: PimProductAttribute[];
  parent_sku?: string;
  parent_entity_code?: string;
  product_model?: string;
  cover_image_url?: string;
  media?: PimMediaItem[];
}

interface PimSearchResponse {
  success: boolean;
  data: {
    results: PimProduct[];
    numFound?: number;  // Solr standard field name
    total?: number;     // Legacy fallback
    start?: number;
    page?: number;
    limit?: number;
  };
}

// ===============================
// Transform PIM product to internal Product type
// ===============================
function transformPimProduct(raw: PimProduct): Product {
  // Extract model from attributes if not directly available
  // Handle both array format and multilingual object format
  let modelAttr: PimProductAttribute | undefined;
  if (Array.isArray(raw.attributes)) {
    modelAttr = raw.attributes.find(a => a.key === 'descrizione-tecnica');
  } else if (raw.attributes && typeof raw.attributes === 'object') {
    // Multilingual format: { it: { key: { key, label, value } } }
    const langAttrs = (raw.attributes as any)?.it || Object.values(raw.attributes)[0];
    if (langAttrs && typeof langAttrs === 'object') {
      modelAttr = langAttrs['descrizione-tecnica'];
    }
  }
  const model = raw.product_model || modelAttr?.value || '';

  return {
    id: raw.id || raw.entity_code || '',
    sku: raw.sku || '',
    name: raw.name || '',
    slug: raw.slug || raw.sku?.toLowerCase() || '',
    // short_description is for display anywhere, description is HTML for product detail only
    description: raw.short_description || '',
    html_description: raw.description || '', // HTML content for product detail tab
    image: {
      id: raw.image?.id || '',
      thumbnail: raw.image?.thumbnail || raw.cover_image_url || '',
      original: raw.image?.original || raw.cover_image_url || '',
    },
    gallery: raw.images?.map(img => ({
      id: img.url,
      thumbnail: img.url,
      original: img.url,
    })) || [],
    quantity: raw.quantity || 0,
    unit: raw.unit || 'pcs',
    price: 0, // Price comes from ERP
    sale_price: 0,
    product_type: 'simple',
    brand: raw.brand ? {
      id: raw.brand.brand_id || '',
      name: raw.brand.label || raw.brand.slug || '',
      slug: raw.brand.slug || '',
      image: raw.brand.logo_url ? { id: '', thumbnail: raw.brand.logo_url, original: raw.brand.logo_url } : undefined,
      logo_url: raw.brand.logo_url,
      brand_id: raw.brand.brand_id,
      label: raw.brand.label,
    } : undefined,
    model: model,
    parent_sku: raw.parent_sku || raw.parent_entity_code || '',
    variations: [],
    tag: [],
    category: { id: '', name: '', slug: '' },
    sold: 0,
    // Pass through media for documents, videos, 3D models
    media: raw.media || [],
    // Pass through attributes for technical specifications
    attributes: raw.attributes || {},
  } as Product;
}

function transformPimProducts(products: PimProduct[]): Product[] {
  return products.map(transformPimProduct);
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

function mapFilterKeys(filters: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(filters)) {
    const pimKey = LEGACY_TO_PIM_FIELD[key] || key;
    mapped[pimKey] = value;
  }
  return mapped;
}

// ===============================
// Fetch function for PIM search (POST)
// ===============================
export const fetchPimProductList = async (
  params: Record<string, any>
): Promise<{
  items: Product[];
  total: number;
}> => {
  const url = `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.SEARCH}`;

  // Build filters object - map legacy field names to PIM field names
  const rawFilters = params.filters || {};
  const filters: Record<string, any> = mapFilterKeys(rawFilters);

  // Build POST body matching PIM API structure
  const body: Record<string, any> = {
    lang: params.lang || 'it',
    text: params.q || params.text || '',
    start: params.start || 0,
    rows: params.rows || params.limit || params.per_page || 12,
    include_faceting: params.include_faceting ?? false,
    include_variants: params.include_variants ?? true,
  };

  // Only add filters if there are any
  if (Object.keys(filters).length > 0) {
    body.filters = filters;
  }

  // Add facet_fields if provided
  if (params.facet_fields) {
    body.facet_fields = params.facet_fields;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PIM search failed: ${response.statusText}`);
  }

  const data: PimSearchResponse = await response.json();

  if (!data.success) {
    throw new Error('PIM search returned unsuccessful response');
  }

  const products = transformPimProducts(data.data.results || []);
  // Use numFound (Solr) or total (legacy) - fallback to products.length only as last resort
  const total = data.data.numFound ?? data.data.total ?? products.length;

  return {
    items: products,
    total,
  };
};

// ===============================
// React Query hook for PIM products
// ===============================
export const usePimProductListQuery = (
  params: Record<string, any>,
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled ?? true;

  // Memoize params to prevent unnecessary re-fetches
  const stableParams = useMemo(() => {
    if (!enabled) return {};
    return { ...params };
  }, [JSON.stringify(params), enabled]);

  const query = useQuery<Product[], Error>({
    queryKey: ['pim-search', stableParams],
    queryFn: async () => {
      const { items } = await fetchPimProductList(stableParams);
      return items;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};

// ===============================
// Infinite Query hook for PIM products (pagination support)
// ===============================
export const usePimProductListInfiniteQuery = (params: Record<string, any>) => {
  const perPage = params.per_page || params.rows || 24;

  // Build stable params without pagination
  const baseParams = useMemo(() => {
    const { start, rows, per_page, ...rest } = params;
    return rest;
  }, [JSON.stringify(params)]);

  return useInfiniteQuery({
    queryKey: ['pim-search-infinite', baseParams, perPage],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await fetchPimProductList({
        ...baseParams,
        start: pageParam * perPage,
        rows: perPage,
      });

      const hasNext = (pageParam + 1) * perPage < result.total;

      return {
        items: result.items,
        total: result.total,
        nextPage: hasNext ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
