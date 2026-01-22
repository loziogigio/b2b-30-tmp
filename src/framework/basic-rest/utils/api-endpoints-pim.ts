// PIM API endpoints
export const API_ENDPOINTS_PIM = {
  SEARCH: '/api/search/search',
  FACET: '/api/search/facet',
  MENU: '/api/public/menu',
  // Collections
  COLLECTIONS: '/api/public/collections',
  COLLECTION_BY_SLUG: '/api/public/collections', // append /{slug}
  COLLECTION_PRODUCTS: '/api/public/collections', // append /{slug}/products
  // ELIA AI Search
  ELIA_INTENT: '/api/elia/intent',
  ELIA_SEARCH: '/api/elia/search',
  ELIA_ANALYZE: '/api/elia/analyze',
  // Correlations (related products)
  CORRELATIONS: '/api/b2b/correlations',
  // Available specs (dynamic discovery)
  AVAILABLE_SPECS: '/api/b2b/search/available-specs',
};

// Base URL for PIM API
export const PIM_API_BASE_URL =
  process.env.NEXT_PUBLIC_PIM_API_URL || 'http://localhost:3001';
