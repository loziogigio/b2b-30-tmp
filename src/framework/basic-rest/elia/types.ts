/**
 * ELIA AI Search Types
 * Based on PIM API: /api/elia/search and /api/elia/intent
 * @see vinc-pim/doc/02-api/elia-api.md
 */

// ================================
// Sort & Filter Types
// ================================

export type SortPreference =
  | 'relevance' // Default - by search relevance
  | 'price_asc' // Cheapest first
  | 'price_desc' // Most expensive first
  | 'quality' // By completeness score
  | 'newest' // Most recent first
  | 'popularity'; // By priority score

export type StockFilter =
  | 'any' // No stock filter (default)
  | 'in_stock' // Only available items
  | 'available_soon'; // Pre-order items

// ================================
// Request Types
// ================================

/** Step 1: Intent extraction request */
export interface EliaIntentRequest {
  query: string; // User search query (3-300 characters)
  language?: 'it' | 'en';
}

/** Step 2: Search request - accepts full intent from Step 1 */
export interface EliaSearchRequest {
  intent: EliaIntentExtraction; // Full intent from Step 1
  language?: 'it' | 'en';
  limit?: number; // Max results (default: 20)
}

// ================================
// Response Types - Step 2 Search
// ================================

export interface EliaSearchResponse {
  success: boolean;
  data: {
    search_id: string; // Unique search ID
    intent: EliaIntentExtraction; // Full intent (pass to Step 3)
    search_info: {
      matched_level: number; // 0-23 (24-level cascade)
      matched_level_name: string; // e.g., "exact + attr_exact + constraint"
      matched_search_text: string; // Actual Solr query text
    };
    products: EliaProduct[]; // Search results
    total_found: number; // Total count
    matched_products: string[]; // Product terms that matched
    matched_attributes: string[]; // Attribute terms that matched
    performance: {
      total_ms: number; // Total response time
    };
  };
}

/** Search info from Step 2 */
export interface EliaSearchInfo {
  matched_level: number; // 0-23 (24-level cascade)
  matched_level_name: string; // e.g., "exact + attr_exact + constraint"
  matched_search_text: string; // Actual Solr query text
}

export interface EliaProduct {
  id: string;
  entity_code?: string;
  sku?: string;
  name: string;
  slug?: string;
  model?: string;
  description?: string;
  short_description?: string;
  cover_image_url?: string;
  image?: {
    thumbnail?: string;
    medium?: string;
    large?: string;
    original?: string;
  };
  brand?: {
    brand_id?: string;
    label?: string;
    slug?: string;
    logo_url?: string;
  };
  attributes?: Record<string, any>;
  // ERP data (after enrichment)
  price?: number;
  net_price?: number;
  gross_price?: number;
  price_discount?: number;
  availability?: number;
  stock_label?: string;
  add_to_cart?: boolean;
}

// ================================
// Response Types - Intent Only
// ================================

export interface EliaIntentResponse {
  success: boolean;
  data: {
    query: string;
    language: string;
    intent: EliaIntentExtraction;
    timestamp: string;
  };
}

/** Synonym term with precision score */
export interface SynonymTerm {
  term: string;
  precision: number; // 0-1 (1 = exact match)
}

/** Constraints for numeric values */
export interface IntentConstraints {
  min?: number;
  max?: number;
  unit?: string; // mq, mm, litri, BTU, etc.
}

/** 5-Array Intent Structure */
export interface EliaIntentExtraction {
  intent_type: 'ricerca' | 'confronto' | 'consiglio' | 'specifico';

  // PRODUCT SYNONYMS (2 levels)
  product_exact: SynonymTerm[]; // Exact product terms (precision: 1.0)
  product_synonyms: SynonymTerm[]; // 2 synonyms (precision: 0.9-0.8)

  // ATTRIBUTE SYNONYMS (3 levels)
  attribute_exact: SynonymTerm[]; // Exact attributes (precision: 1.0)
  attribute_synonyms: SynonymTerm[]; // 3+ synonyms (precision: 0.9-0.7)
  attribute_related: SynonymTerm[]; // 3+ related terms (precision: 0.6-0.4)

  // FILTERS & MODIFIERS
  sort_by: SortPreference;
  stock_filter: StockFilter;
  price_min?: number;
  price_max?: number;
  constraints?: IntentConstraints;

  // RESPONSE
  user_message: string;
  confidence: number;
}

// ================================
// Error Response
// ================================

export interface EliaErrorResponse {
  success: false;
  error: string;
  code:
    | 'VALIDATION_ERROR'
    | 'INTENT_EXTRACTION_FAILED'
    | 'SEARCH_FAILED'
    | 'INTERNAL_ERROR';
  details?: string;
}

// ================================
// UI State Types
// ================================

export type EliaPhase =
  | 'idle'
  | 'searching' // Calling /api/elia/search
  | 'enriching' // Fetching ERP prices
  | 'analyzing' // Calling /api/elia/analyze
  | 'done'
  | 'error';

export interface EliaReasoningStep {
  id: string;
  phase: EliaPhase;
  label: string;
  detail?: string;
  keywords?: string[]; // Keywords as tags
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface EliaSearchState {
  phase: EliaPhase;
  query: string;
  searchResult: EliaSearchResponse['data'] | null;
  reasoningSteps: EliaReasoningStep[];
  error: string | null;
}

// ================================
// Labels for UI
// ================================

export const INTENT_TYPE_LABELS: Record<
  EliaIntentExtraction['intent_type'],
  string
> = {
  ricerca: 'Ricerca prodotti',
  confronto: 'Confronto prodotti',
  consiglio: 'Richiesta consiglio',
  specifico: 'Prodotto specifico',
};

export const SORT_LABELS: Record<SortPreference, string> = {
  relevance: 'Rilevanza',
  price_asc: 'Prezzo crescente',
  price_desc: 'Prezzo decrescente',
  quality: 'Qualit\u00e0',
  newest: 'Pi\u00f9 recenti',
  popularity: 'Popolarit\u00e0',
};

export const STOCK_FILTER_LABELS: Record<StockFilter, string> = {
  any: 'Tutti',
  in_stock: 'Disponibili',
  available_soon: 'In arrivo',
};

/** Helper function to get cascade level description */
export function getCascadeLevelLabel(level: number): string {
  if (level <= 5) return 'Ricerca esatta';
  if (level <= 11) return 'Prima variante';
  if (level <= 17) return 'Seconda variante';
  return 'Solo prodotto';
}

// ================================
// Step 3: Analyze Types
// ================================

/** Request for /api/elia/analyze - B2B sends minimal ERP data + full intent */
export interface EliaAnalyzeRequest {
  /** Products with ERP data (entity_code + price + stock) */
  products: ProductErpData[];
  /** Full intent from Step 1/2 - passed to Claude for analysis */
  intent: EliaIntentExtraction;
  /** Response language */
  language?: 'it' | 'en';
  /** Total products found in Solr from Step 2 (for pagination info) */
  total_found?: number;
}

/** Minimal ERP data sent by B2B - PIM fetches product details from Solr */
export interface ProductErpData {
  entity_code: string;
  price?: number; // Min price from ERP
  availability?: number; // Stock quantity
}

/** Response from /api/elia/analyze */
export interface EliaAnalyzeResponse {
  success: boolean;
  data: {
    products: AnalyzedProduct[];
    total_count: number; // Count after Claude filtering
    received_count: number; // Products received for analysis
    total_found: number; // Total products in Solr from Step 2
    summary: string; // AI-generated summary
  };
}

/** Product after Claude AI analysis - B2B fetches product info + prices separately */
export interface AnalyzedProduct {
  entity_code: string;
  attribute_match_score: number;
  match_reasons: string[];
  ranking_reason?: string;
}
