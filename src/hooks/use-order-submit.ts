'use client';

import { useCallback, useState } from 'react';
import { post as pimPost } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { ERP_STATIC } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import { ensureActiveCart } from '@framework/cart/b2b-cart';

// ── Anomaly flag → human-readable label ─────────────────────────────────────

export const ANOMALY_FLAG_LABELS: Record<string, string> = {
  IsPromozioneNonValida: 'Promozione non valida',
  IsPromozioneNonApplicabile: 'Promozione non applicabile',
  IsPromozioneScaduta: 'Promozione scaduta',
  IsPromozioneAPezziNonValida: 'Promozione a pezzi non valida',
  IsPromozioneAValoreNonValida: 'Promozione a valore non valida',
  IsListinoNonValido: 'Listino non valido',
  IsArticoloNonVendibile: 'Articolo non vendibile',
  IsImballoNonValido: 'Imballo non valido',
  IsArticoloInGruppoEsclusoDallaVendita: 'Articolo escluso dalla vendita',
};

export function formatAnomalyFlags(anomaly: ErpAnomaly): string {
  const flags = Object.keys(ANOMALY_FLAG_LABELS).filter(
    (k) => (anomaly as any)[k] === true,
  );
  return (
    flags.map((k) => ANOMALY_FLAG_LABELS[k]).join(', ') ||
    anomaly.Messaggio ||
    'Anomalia'
  );
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface ErpAnomaly {
  IdRiga: number;
  Messaggio?: string;
  [flag: string]: any;
}

export interface ErpItem {
  erp_line_number: number;
  erp_data?: { oarti?: string; [k: string]: any };
  [k: string]: any;
}

export interface AnomalyResult {
  anomalies: ErpAnomaly[];
  erpItems: ErpItem[];
  errorMessage?: string;
}

/**
 * Windmill-side warning when the cart's `erp_cart_id` is already in
 * MySQL `ordini` and the Mongo items have the same count as the old
 * ordini_dettagli rows. The customer can confirm the duplicate (re-POST
 * with `force_duplicate_submit: true`) or cancel.
 */
export interface DuplicateWarning {
  erp_cart_id: number;
  /** NULL if the cart was submitted so recently that the ERP batch hasn't
   *  yet promoted stato 'T' → 'I' and assigned a numero_ordine. */
  ordini_numero: number | null;
  ordini_causale: string | null;
  ordini_anno: string | null;
  ordini_items_count: number;
  mongo_items_count: number;
  errorMessage?: string;
}

export interface SubmitOpts {
  delivery_date: string;
  delivery_type: string;
  notes?: string;
  pickup_data?: any;
  autofix?: boolean;
  /** Re-submit of a cart whose erp_cart_id is already in ordini — customer confirmed duplicate */
  force_duplicate_submit?: boolean;
}

export type SubmitOutcome =
  | { type: 'success' }
  | { type: 'processing'; orderId: string }
  | { type: 'anomalies'; result: AnomalyResult }
  | { type: 'duplicate_warning'; warning: DuplicateWarning }
  | { type: 'already_submitted'; message?: string }
  | { type: 'error'; message: string };

// ── Hook ────────────────────────────────────────────────────────────────────

export function useOrderSubmit(lang: string) {
  const { meta, resetCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(
    null,
  );
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateWarning | null>(null);
  const [orderAlreadySubmitted, setOrderAlreadySubmitted] = useState<{
    message?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const getOrderId = useCallback(() => {
    return meta?.orderId || ERP_STATIC.vinc_order_id;
  }, [meta]);

  const submitOrder = useCallback(
    async (opts: SubmitOpts): Promise<SubmitOutcome> => {
      const orderId = getOrderId();
      if (!orderId) return { type: 'error', message: 'No active cart' };

      setIsSubmitting(true);
      setSubmitError(null);
      setAnomalyResult(null);
      setDuplicateWarning(null);
      setOrderAlreadySubmitted(null);

      try {
        const res = await pimPost<any>(CS_CART.SUBMIT(orderId), {
          delivery_date: opts.delivery_date,
          delivery_type: opts.delivery_type,
          notes: opts.notes,
          pickup_data: opts.pickup_data,
          autofix: opts.autofix || undefined,
          force_duplicate_submit: opts.force_duplicate_submit || undefined,
        });

        // 200 sync success or 202 async
        if (res?.processing) {
          await resetCart();
          await ensureActiveCart();
          if (typeof window !== 'undefined') {
            window.location.href = `/${lang}/complete-order?processing=true&order_id=${orderId}`;
          }
          return { type: 'processing', orderId };
        }

        // Sync success
        await resetCart();
        await ensureActiveCart();
        if (typeof window !== 'undefined') {
          window.location.href = `/${lang}/complete-order`;
        }
        return { type: 'success' };
      } catch (error: any) {
        const status = error?.response?.status;
        const data = error?.response?.data;

        // 422 — ERP validation rejected. Two possible shapes under the
        // shared `windmill.modified_data.erp_data` envelope:
        //   - duplicate_warning → cart already in ordini, confirm to proceed
        //   - anomalies → promo/listino/articolo issues, retry with autofix
        if (status === 422) {
          const erpData = data?.windmill?.modified_data?.erp_data || {};

          if (erpData.duplicate_warning) {
            const dw = erpData.duplicate_warning;
            const warning: DuplicateWarning = {
              erp_cart_id: dw.erp_cart_id,
              ordini_numero: dw.ordini_numero ?? null,
              ordini_causale: dw.ordini_causale
                ? String(dw.ordini_causale)
                : null,
              ordini_anno:
                dw.ordini_anno != null ? String(dw.ordini_anno) : null,
              ordini_items_count: Number(dw.ordini_items_count ?? 0),
              mongo_items_count: Number(dw.mongo_items_count ?? 0),
              errorMessage: data?.error,
            };
            setDuplicateWarning(warning);
            return { type: 'duplicate_warning', warning };
          }

          const anomalies: ErpAnomaly[] = erpData.anomalies || [];
          const erpItems: ErpItem[] =
            data?.windmill?.modified_data?.erp_items || [];
          const result: AnomalyResult = {
            anomalies,
            erpItems,
            errorMessage: data?.error,
          };
          setAnomalyResult(result);
          return { type: 'anomalies', result };
        }

        // 409 — already being submitted
        if (status === 409) {
          const msg = 'Ordine già in fase di invio';
          setSubmitError(msg);
          return { type: 'error', message: msg };
        }

        // Other errors
        const msg = data?.error || error?.message || "Errore durante l'invio";
        setSubmitError(msg);
        return { type: 'error', message: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [getOrderId, lang, resetCart],
  );

  const resubmitWithAutofix = useCallback(
    async (opts: SubmitOpts): Promise<SubmitOutcome> => {
      return submitOrder({ ...opts, autofix: true });
    },
    [submitOrder],
  );

  /**
   * Customer confirmed they want to send a duplicate of an already-submitted
   * cart. Re-POST with `force_duplicate_submit: true` so Windmill mints a
   * fresh ERP cart instead of returning the warning again.
   */
  const confirmDuplicateSubmit = useCallback(
    async (opts: SubmitOpts): Promise<SubmitOutcome> => {
      return submitOrder({ ...opts, force_duplicate_submit: true });
    },
    [submitOrder],
  );

  const clearAnomalies = useCallback(() => {
    setAnomalyResult(null);
    setSubmitError(null);
  }, []);

  const clearDuplicateWarning = useCallback(() => {
    setDuplicateWarning(null);
    setSubmitError(null);
  }, []);

  const clearOrderAlreadySubmitted = useCallback(() => {
    setOrderAlreadySubmitted(null);
    setSubmitError(null);
  }, []);

  return {
    submitOrder,
    resubmitWithAutofix,
    confirmDuplicateSubmit,
    isSubmitting,
    anomalyResult,
    duplicateWarning,
    orderAlreadySubmitted,
    submitError,
    clearAnomalies,
    clearDuplicateWarning,
    clearOrderAlreadySubmitted,
  };
}
