import { useQuery } from '@tanstack/react-query';
import { get } from '@framework/utils/httpPIM';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';

export interface CollectionHeroImage {
  url: string;
  alt_text?: string;
  cdn_key?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hero_image?: CollectionHeroImage;
  product_count?: number;
  display_order?: number;
  created_at: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

interface CollectionsResponse {
  success: boolean;
  collections: Collection[];
  total: number;
}

interface CollectionResponse {
  success: boolean;
  collection: Collection;
}

// Fetch all collections via proxy (credentials injected server-side)
async function fetchCollections(): Promise<Collection[]> {
  const result = await get<CollectionsResponse>(API_ENDPOINTS_PIM.COLLECTIONS);
  return result.collections || [];
}

// Fetch single collection by slug via proxy (credentials injected server-side)
async function fetchCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const result = await get<CollectionResponse>(
      `${API_ENDPOINTS_PIM.COLLECTION_BY_SLUG}/${slug}`,
    );
    return result.collection || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

// Hook to get all collections
export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to get single collection by slug
export function useCollection(slug: string) {
  return useQuery({
    queryKey: ['collection', slug],
    queryFn: () => fetchCollectionBySlug(slug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!slug,
  });
}
