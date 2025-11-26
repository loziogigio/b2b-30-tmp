import { useQuery } from '@tanstack/react-query';
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
    total?: number;
    page?: number;
    limit?: number;
  };
}

// ===============================
// Transform PIM product to internal Product type
// ===============================
function transformPimProduct(raw: PimProduct): Product {
  // Extract model from attributes if not directly available
  const modelAttr = raw.attributes?.find(a => a.key === 'descrizione-tecnica');
  const model = raw.product_model || modelAttr?.value || '';

  return {
    id: raw.id || raw.entity_code || '',
    sku: raw.sku || '',
    name: raw.name || '',
    slug: raw.slug || raw.sku?.toLowerCase() || '',
    description: raw.description || raw.short_description || '',
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
    category: { name: '', slug: '' },
    // Pass through media for documents, videos, 3D models
    media: raw.media || [],
  } as Product;
}

function transformPimProducts(products: PimProduct[]): Product[] {
  return products.map(transformPimProduct);
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

  // Build filters object - support array filters like sku, brand_id, etc.
  const filters: Record<string, any> = { ...(params.filters || {}) };

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
  const total = data.data.total || products.length;

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
