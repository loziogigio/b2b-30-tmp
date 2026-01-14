import { useQuery } from '@tanstack/react-query';
import {
  API_ENDPOINTS_PIM,
  PIM_API_BASE_URL,
} from '@framework/utils/api-endpoints-pim';

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

// Fetch all collections
async function fetchCollections(): Promise<Collection[]> {
  const url = `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.COLLECTIONS}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID!,
      'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }

  const result: CollectionsResponse = await response.json();
  return result.collections || [];
}

// Fetch single collection by slug
async function fetchCollectionBySlug(slug: string): Promise<Collection | null> {
  const url = `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.COLLECTION_BY_SLUG}/${slug}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID!,
      'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch collection');
  }

  const result: CollectionResponse = await response.json();
  return result.collection || null;
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
