import { useState, useCallback, useRef } from 'react';
import {
  API_ENDPOINTS_PIM,
  PIM_API_BASE_URL,
} from '../utils/api-endpoints-pim';
import { fetchErpPrices } from '../erp/prices';
import { ERP_STATIC } from '../utils/static';
import type {
  EliaAnalyzeRequest,
  EliaAnalyzeResponse,
  AnalyzedProduct,
  ProductErpData,
  EliaProduct,
  EliaIntentExtraction,
  EliaReasoningStep,
} from './types';

interface UseEliaAnalyzeReturn {
  analyze: (
    products: EliaProduct[],
    intent: EliaIntentExtraction,
    totalFound: number,
    language?: 'it' | 'en',
  ) => Promise<EliaAnalyzeResponse['data'] | null>;
  isAnalyzing: boolean;
  analyzeResult: EliaAnalyzeResponse['data'] | null;
  analyzedProducts: AnalyzedProduct[];
  summary: string | null;
  reasoningSteps: EliaReasoningStep[];
  error: string | null;
  reset: () => void;
}

/**
 * Hook for ELIA Step 3: Product Analysis with ELIA AI
 */
export function useEliaAnalyze(): UseEliaAnalyzeReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<
    EliaAnalyzeResponse['data'] | null
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

  const analyze = useCallback(
    async (
      products: EliaProduct[],
      intent: EliaIntentExtraction,
      totalFound: number,
      language: 'it' | 'en' = 'it',
    ): Promise<EliaAnalyzeResponse['data'] | null> => {
      if (products.length === 0) {
        setError('Nessun prodotto da analizzare');
        return null;
      }

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setIsAnalyzing(true);
      setError(null);
      setAnalyzeResult(null);
      setReasoningSteps([]);

      try {
        // Show analyzing step
        addStep({
          id: 'analyzing',
          phase: 'analyzing',
          label: '🧠 Analisi AI...',
          detail: 'Elaborazione in corso',
          status: 'active',
        });

        // Fetch ERP prices
        const entityCodes = products
          .map((p) => p.entity_code || p.id)
          .filter(Boolean) as string[];

        let erpPricesMap: Record<string, any> = {};

        try {
          const erpPayload = {
            entity_codes: entityCodes,
            ...ERP_STATIC,
          };
          erpPricesMap = (await fetchErpPrices(erpPayload)) || {};
        } catch {
          // ERP fetch failed, continue with empty prices
        }

        // Build ProductErpData array - send only entity_code, min price, availability
        const productsWithErp: ProductErpData[] = entityCodes.map(
          (entityCode) => {
            const erpData = erpPricesMap[entityCode] || {};
            // Get minimum price among all price fields
            const prices = [
              erpData.net_price,
              erpData.gross_price,
              erpData.price,
              erpData.price_discount,
            ].filter((p): p is number => typeof p === 'number' && p > 0);
            const minPrice =
              prices.length > 0 ? Math.min(...prices) : undefined;

            return {
              entity_code: entityCode,
              price: minPrice,
              availability:
                erpData.availability ??
                erpData.product_label_action?.availability,
            };
          },
        );

        // Send full intent to analyze endpoint
        const analyzeRequest: EliaAnalyzeRequest = {
          products: productsWithErp,
          intent,
          language,
          total_found: totalFound,
        };

        const response = await fetch(
          `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.ELIA_ANALYZE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(analyzeRequest),
            signal: abortRef.current.signal,
          },
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Analisi fallita');
        }

        const result = data as EliaAnalyzeResponse;

        // Update with final analysis
        updateStep('analyzing', {
          status: 'completed',
          label: '✅ Analisi completata',
          detail: result.data.summary,
        });

        setAnalyzeResult(result.data);
        return result.data;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return null;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Errore durante l'analisi";
        setError(errorMessage);

        updateStep('analyzing', {
          status: 'error',
          label: '❌ Errore',
          detail: errorMessage,
        });

        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setAnalyzeResult(null);
    setReasoningSteps([]);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    analyze,
    isAnalyzing,
    analyzeResult,
    analyzedProducts: analyzeResult?.products || [],
    summary: analyzeResult?.summary || null,
    reasoningSteps,
    error,
    reset,
  };
}
