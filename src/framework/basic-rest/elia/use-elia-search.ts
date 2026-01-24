import { useState, useCallback, useRef } from 'react';
import { API_ENDPOINTS_PIM } from '../utils/api-endpoints-pim';
import type {
  EliaIntentRequest,
  EliaIntentResponse,
  EliaSearchRequest,
  EliaSearchResponse,
  EliaProduct,
  EliaIntentExtraction,
  EliaReasoningStep,
} from './types';

interface UseEliaSearchReturn {
  search: (
    query: string,
    language?: 'it' | 'en',
  ) => Promise<EliaSearchResponse['data'] | null>;
  isSearching: boolean;
  searchResult: EliaSearchResponse['data'] | null;
  products: EliaProduct[];
  totalFound: number;
  intent: EliaIntentExtraction | null;
  userMessage: string | null;
  reasoningSteps: EliaReasoningStep[];
  error: string | null;
  reset: () => void;
}

/**
 * Hook for ELIA 2-step search:
 * 1. Call /api/elia/intent - Extract intent from query
 * 2. Call /api/elia/search - Search products with full intent
 */
export function useEliaSearch(): UseEliaSearchReturn {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<
    EliaSearchResponse['data'] | null
  >(null);
  const [reasoningSteps, setReasoningSteps] = useState<EliaReasoningStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const addStep = (step: EliaReasoningStep) => {
    setReasoningSteps((prev) => [...prev, step]);
  };

  const updateStep = (stepId: string, updates: Partial<EliaReasoningStep>) => {
    setReasoningSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    );
  };

  const search = useCallback(
    async (
      query: string,
      language: 'it' | 'en' = 'it',
    ): Promise<EliaSearchResponse['data'] | null> => {
      // Validate query
      if (query.trim().length < 3) {
        setError('La query deve avere almeno 3 caratteri');
        return null;
      }

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsSearching(true);
      setError(null);
      setSearchResult(null);
      setReasoningSteps([]);

      try {
        // Step 1: Show searching message
        addStep({
          id: 'searching',
          phase: 'searching',
          label: '🔍 Ricerca in corso...',
          detail: query,
          status: 'active',
        });

        // Step 1: Call intent endpoint via proxy (credentials injected server-side)
        const intentRequest: EliaIntentRequest = { query, language };
        const intentResponse = await fetch(
          `/api/proxy/pim/${API_ENDPOINTS_PIM.ELIA_INTENT}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(intentRequest),
            signal: abortRef.current.signal,
          },
        );

        const intentData = await intentResponse.json();

        if (!intentData.success) {
          throw new Error(intentData.error || 'Estrazione intento fallita');
        }

        const intentResult = intentData as EliaIntentResponse;
        const intent = intentResult.data.intent;

        // Extract keywords from 5-array structure (product_exact + attribute_exact)
        const productKeywords = intent.product_exact?.map((t) => t.term) || [];
        const attributeKeywords =
          intent.attribute_exact?.map((t) => t.term) || [];
        const keywords = [...productKeywords, ...attributeKeywords];

        // Update step 1: Show AI message + keywords as tags
        updateStep('searching', {
          status: 'completed',
          label: '💬',
          detail: intent.user_message,
          keywords: keywords,
        });

        // Step 2: Call search endpoint with full intent
        const searchRequest: EliaSearchRequest = {
          intent,
          language,
          limit: 10,
        };

        // Step 2: Call search endpoint via proxy (credentials injected server-side)
        const searchResponse = await fetch(
          `/api/proxy/pim/${API_ENDPOINTS_PIM.ELIA_SEARCH}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchRequest),
            signal: abortRef.current.signal,
          },
        );

        const searchData = await searchResponse.json();

        if (!searchData.success) {
          throw new Error(searchData.error || 'Ricerca fallita');
        }

        const result = searchData as EliaSearchResponse;
        const { products, total_found } = result.data;

        // Step 2: Show results count
        addStep({
          id: 'results',
          phase: 'searching',
          label: '📦 Trovati:',
          detail: `${total_found} prodotti`,
          status: 'completed',
        });

        setSearchResult(result.data);
        return result.data;
      } catch (err) {
        // Don't show error for aborted requests
        if ((err as Error).name === 'AbortError') {
          return null;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Errore durante la ricerca';
        setError(errorMessage);

        // Update steps to show error
        setReasoningSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' || step.status === 'pending'
              ? { ...step, status: 'error' as const }
              : step,
          ),
        );

        addStep({
          id: 'error',
          phase: 'error',
          label: '❌ Errore',
          detail: errorMessage,
          status: 'error',
        });

        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setSearchResult(null);
    setReasoningSteps([]);
    setError(null);
    setIsSearching(false);
  }, []);

  return {
    search,
    isSearching,
    searchResult,
    products: searchResult?.products || [],
    totalFound: searchResult?.total_found || 0,
    intent: searchResult?.intent || null,
    userMessage: searchResult?.intent?.user_message || null,
    reasoningSteps,
    error,
    reset,
  };
}
