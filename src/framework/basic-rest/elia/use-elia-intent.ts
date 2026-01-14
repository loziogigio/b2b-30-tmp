import { useState, useCallback } from 'react';
import {
  API_ENDPOINTS_PIM,
  PIM_API_BASE_URL,
} from '../utils/api-endpoints-pim';
import type {
  EliaIntentRequest,
  EliaIntentResponse,
  EliaIntentExtraction,
  EliaReasoningStep,
  SortPreference,
  StockFilter,
} from './types';

interface UseEliaIntentReturn {
  extractIntent: (
    query: string,
    language?: 'it' | 'en',
  ) => Promise<EliaIntentExtraction | null>;
  isExtracting: boolean;
  intent: EliaIntentExtraction | null;
  reasoningSteps: EliaReasoningStep[];
  error: string | null;
  reset: () => void;
}

/**
 * Hook for extracting search intent using ELIA AI
 * Calls PIM /api/elia/intent endpoint
 */
export function useEliaIntent(): UseEliaIntentReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [intent, setIntent] = useState<EliaIntentExtraction | null>(null);
  const [reasoningSteps, setReasoningSteps] = useState<EliaReasoningStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (stepId: string, updates: Partial<EliaReasoningStep>) => {
    setReasoningSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    );
  };

  const addStep = (step: EliaReasoningStep) => {
    setReasoningSteps((prev) => [...prev, step]);
  };

  const extractIntent = useCallback(
    async (
      query: string,
      language: 'it' | 'en' = 'it',
    ): Promise<EliaIntentExtraction | null> => {
      if (query.length < 3) {
        setError('La query deve avere almeno 3 caratteri');
        return null;
      }

      setIsExtracting(true);
      setError(null);
      setIntent(null);
      setReasoningSteps([]);

      // Step 1: Analyzing query
      const step1: EliaReasoningStep = {
        id: 'analyze',
        phase: 'searching',
        label: 'Analisi della richiesta',
        detail: `"${query}"`,
        status: 'active',
      };
      addStep(step1);

      // Simulate small delay for UX
      await new Promise((r) => setTimeout(r, 300));

      // Step 2: Understanding intent
      const step2: EliaReasoningStep = {
        id: 'intent',
        phase: 'searching',
        label: "Comprensione dell'intento",
        status: 'pending',
      };
      addStep(step2);

      try {
        const response = await fetch(
          `${PIM_API_BASE_URL}${API_ENDPOINTS_PIM.ELIA_INTENT}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.NEXT_PUBLIC_API_KEY_ID!,
              'X-API-Secret': process.env.NEXT_PUBLIC_API_SECRET!,
            },
            body: JSON.stringify({ query, language } as EliaIntentRequest),
          },
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to extract intent');
        }

        const intentData = data as EliaIntentResponse;
        const extractedIntent = intentData.data.intent;

        // Update step 1 as completed
        updateStep('analyze', { status: 'completed' });

        // Update step 2 with intent type
        updateStep('intent', {
          status: 'active',
          detail: getIntentTypeLabel(extractedIntent.intent_type),
        });

        await new Promise((r) => setTimeout(r, 200));
        updateStep('intent', { status: 'completed' });

        // Step 3: Keywords identified (from 5-array structure)
        const productKeywords =
          extractedIntent.product_exact?.map((t) => t.term) || [];
        const attributeKeywords =
          extractedIntent.attribute_exact?.map((t) => t.term) || [];
        const allKeywords = [...productKeywords, ...attributeKeywords];

        const step3: EliaReasoningStep = {
          id: 'keywords',
          phase: 'searching',
          label: 'Parole chiave identificate',
          detail: allKeywords.join(', '),
          status: 'active',
        };
        addStep(step3);

        await new Promise((r) => setTimeout(r, 200));
        updateStep('keywords', { status: 'completed' });

        // Step 4: Synonyms generated (count from 5-array structure)
        const synonymCount =
          (extractedIntent.product_synonyms?.length || 0) +
          (extractedIntent.attribute_synonyms?.length || 0) +
          (extractedIntent.attribute_related?.length || 0);

        const step4: EliaReasoningStep = {
          id: 'synonyms',
          phase: 'searching',
          label: 'Varianti di ricerca',
          detail: `${synonymCount} varianti generate`,
          status: 'active',
        };
        addStep(step4);

        await new Promise((r) => setTimeout(r, 200));
        updateStep('synonyms', { status: 'completed' });

        // Step 5: Modifiers detected (sort_by, stock_filter)
        const modifiers: string[] = [];
        if (
          extractedIntent.sort_by &&
          extractedIntent.sort_by !== 'relevance'
        ) {
          modifiers.push(getSortLabel(extractedIntent.sort_by));
        }
        if (
          extractedIntent.stock_filter &&
          extractedIntent.stock_filter !== 'any'
        ) {
          modifiers.push(getStockLabel(extractedIntent.stock_filter));
        }

        if (modifiers.length > 0) {
          const step5: EliaReasoningStep = {
            id: 'modifiers',
            phase: 'searching',
            label: 'Preferenze rilevate',
            detail: modifiers.join(', '),
            status: 'completed',
          };
          addStep(step5);
        }

        // Step 6: Constraints detected (from new constraints object)
        const constraints = extractedIntent.constraints;
        const hasConstraints = constraints?.min || constraints?.max;

        if (hasConstraints) {
          const constraintDetails: string[] = [];
          if (constraints.min) constraintDetails.push(`≥ ${constraints.min}`);
          if (constraints.max) constraintDetails.push(`≤ ${constraints.max}`);
          if (constraints.unit && constraintDetails.length > 0) {
            constraintDetails[constraintDetails.length - 1] +=
              ` ${constraints.unit}`;
          }

          const stepConstraints: EliaReasoningStep = {
            id: 'constraints',
            phase: 'searching',
            label: 'Vincoli dimensionali',
            detail: constraintDetails.join(', '),
            status: 'completed',
          };
          addStep(stepConstraints);
        }

        // Step 7: Price filters detected
        const hasFilters =
          extractedIntent.price_min || extractedIntent.price_max;

        if (hasFilters) {
          const filterDetails: string[] = [];
          if (extractedIntent.price_max)
            filterDetails.push(`max €${extractedIntent.price_max}`);
          if (extractedIntent.price_min)
            filterDetails.push(`min €${extractedIntent.price_min}`);

          const stepFilters: EliaReasoningStep = {
            id: 'filters',
            phase: 'searching',
            label: 'Filtri prezzo',
            detail: filterDetails.join(', '),
            status: 'completed',
          };
          addStep(stepFilters);
        }

        // Final step: Ready
        const stepReady: EliaReasoningStep = {
          id: 'ready',
          phase: 'done',
          label: 'Pronto per la ricerca',
          detail: extractedIntent.user_message,
          status: 'completed',
        };
        addStep(stepReady);

        setIntent(extractedIntent);
        return extractedIntent;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Errore sconosciuto';
        setError(errorMessage);

        // Update steps to show error
        setReasoningSteps((prev) =>
          prev.map((step) =>
            step.status === 'active' || step.status === 'pending'
              ? { ...step, status: 'error' as const }
              : step,
          ),
        );

        // Add error step
        const errorStep: EliaReasoningStep = {
          id: 'error',
          phase: 'error',
          label: 'Errore',
          detail: errorMessage,
          status: 'error',
        };
        addStep(errorStep);

        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setIntent(null);
    setReasoningSteps([]);
    setError(null);
    setIsExtracting(false);
  }, []);

  return {
    extractIntent,
    isExtracting,
    intent,
    reasoningSteps,
    error,
    reset,
  };
}

// Helper functions
function getIntentTypeLabel(
  intentType: EliaIntentExtraction['intent_type'],
): string {
  const labels: Record<typeof intentType, string> = {
    ricerca: 'Ricerca prodotti',
    confronto: 'Confronto prodotti',
    consiglio: 'Richiesta consiglio',
    specifico: 'Prodotto specifico',
  };
  return labels[intentType];
}

function getSortLabel(sortBy: SortPreference): string {
  const labels: Record<SortPreference, string> = {
    relevance: 'Rilevanza',
    price_asc: 'Prezzo crescente',
    price_desc: 'Prezzo decrescente',
    quality: 'Qualità',
    newest: 'Più recenti',
    popularity: 'Popolarità',
  };
  return labels[sortBy];
}

function getStockLabel(stockFilter: StockFilter): string {
  const labels: Record<StockFilter, string> = {
    any: 'Tutti',
    in_stock: 'Solo disponibili',
    available_soon: 'In arrivo',
  };
  return labels[stockFilter];
}
