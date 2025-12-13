// PIM API endpoints
export const API_ENDPOINTS_PIM = {
  SEARCH: '/api/search/search',
  FACET: '/api/search/facet',
  MENU: '/api/public/menu',
  // ELIA AI Search
  ELIA_INTENT: '/api/elia/intent',
  ELIA_SEARCH: '/api/elia/search',
  ELIA_ANALYZE: '/api/elia/analyze',
};

// Base URL for PIM API
export const PIM_API_BASE_URL =
  process.env.NEXT_PUBLIC_PIM_API_URL || 'http://localhost:3001';
