'use client';

import { useCallback, useState } from 'react';
import { post as pimPost } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { ERP_STATIC } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import { ensureActiveCart } from '@framework/cart/b2b-cart';
import { useCartSettings } from '@/hooks/use-cart-settings';
import { resolveOrderSuccessSlug } from '@/lib/erp/cart-config.types';

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

/**
 * A line the ERP could not export (a transient/technical failure), NOT a
 * price/promo anomaly. Lives in `windmill.modified_data.erp_item_errors`,
 * separate from `erp_data.anomalies`. `error` is the raw backend reason
 * (e.g. "Failed after 3 attempts") — kept for logging, never shown verbatim
 * to the customer; the UI shows a generic "retry / contact us" message.
 */
export interface ErpItemError {
  oarti?: string;
  line_number?: number;
  error?: string;
}

export interface AnomalyResult {
  anomalies: ErpAnomaly[];
  erpItems: ErpItem[];
  /** ERP export failures (distinct from price/promo anomalies). Optional so
   *  existing constructors need no change; useOrderSubmit always populates it. */
  itemErrors?: ErpItemError[];
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
  /** Validated coupon applied to the order; carried through to MyMB via the order sync. */
  coupon?: Record<string, unknown> | null;
  /**
   * When false, submitOrder performs NO navigation and NO cart reset — it just
   * returns the outcome (with `orderNumber` on success). The inline flow
   * controller opts out so it can own polling, cart-reset, and redirect.
   * Defaults to true, preserving the default-theme checkout behavior.
   */
  redirectOnComplete?: boolean;
}

export type SubmitOutcome =
  | { type: 'success'; orderNumber?: string }
  | { type: 'processing'; orderId: string }
  | { type: 'anomalies'; result: AnomalyResult }
  | { type: 'duplicate_warning'; warning: DuplicateWarning }
  | { type: 'already_submitted'; message?: string }
  | { type: 'error'; message: string };

// ── Hook ────────────────────────────────────────────────────────────────────

export function useOrderSubmit(lang: string) {
  const { meta, resetCart } = useCart();
  const { settings: cartSettings } = useCartSettings();
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
        const res = await pimPost<any>(
          CS_CART.SUBMIT(orderId),
          {
            delivery_date: opts.delivery_date,
            delivery_type: opts.delivery_type,
            notes: opts.notes,
            pickup_data: opts.pickup_data,
            autofix: opts.autofix || undefined,
            force_duplicate_submit: opts.force_duplicate_submit || undefined,
            coupon: opts.coupon || undefined,
          },
          // No client timeout on submit. The submit deliberately blocks on the
          // ERP "before" hook and only returns 202 once the server's own
          // sync budget is exceeded; that can take longer than the shared
          // httpPIM 30s default, which would otherwise abort a perfectly
          // healthy in-flight submit with "timeout of 30000ms exceeded". The
          // staged progress modal ("leave this page open") + resume-on-reload
          // cover the wait; the server, not the client, decides when to hand
          // back 202/processing.
          { timeout: 0 },
        );

        // Backend occasionally returns HTTP 200 with an error code body when the
        // cart is no longer a draft (e.g. after the ERP batch has finalised it).
        // Detect this before treating the response as a success.
        if (
          res?.code === 'ORDER_NOT_DRAFT' ||
          res?.code === 'ORDER_NOT_RESUBMITTABLE'
        ) {
          setOrderAlreadySubmitted({ message: res?.error });
          return { type: 'already_submitted', message: res?.error };
        }

        const redirect = opts.redirectOnComplete !== false;

        // 202 async — the order is now processing on the ERP.
        if (res?.processing) {
          if (redirect) {
            await resetCart(undefined, { deleteServer: false });
            await ensureActiveCart();
            if (typeof window !== 'undefined') {
              window.location.href = `/${lang}/complete-order?processing=true&order_id=${orderId}`;
            }
          }
          return { type: 'processing', orderId };
        }

        // 200 sync success. The order is finalised, so skip the server cart
        // delete (would 400). When redirect is off, the caller owns cart-reset
        // and navigation.
        const orderNumber: string | undefined = res?.order_number
          ? String(res.order_number)
          : undefined;
        if (redirect) {
          await resetCart(undefined, { deleteServer: false });
          await ensureActiveCart();
          if (typeof window !== 'undefined') {
            const successSlug = resolveOrderSuccessSlug(
              lang,
              cartSettings.orderSuccessPages,
            );
            window.location.href = successSlug
              ? `/${lang}/${successSlug}`
              : `/${lang}/complete-order`;
          }
        }
        return { type: 'success', orderNumber };
      } catch (error: any) {
        const status = error?.response?.status;
        const data = error?.response?.data;

        // Cart no longer a draft — the ERP batch has already promoted it or the
        // ordini row is final. Surface a dedicated outcome so the UI can resync
        // by reloading instead of letting the user hammer the Send button.
        if (
          data?.code === 'ORDER_NOT_DRAFT' ||
          data?.code === 'ORDER_NOT_RESUBMITTABLE'
        ) {
          setOrderAlreadySubmitted({ message: data?.error });
          return { type: 'already_submitted', message: data?.error };
        }

        // 422 — ERP validation rejected. Shapes under the shared
        // `windmill.modified_data` envelope:
        //   - erp_data.duplicate_warning → cart already in ordini, confirm to proceed
        //   - erp_data.anomalies → promo/listino/articolo issues, retry with autofix
        //   - erp_item_errors → lines the ERP could not export (transient/technical
        //     failure); NOT autofixable — the UI offers a retry, not a price update.
        if (status === 422) {
          const modified = data?.windmill?.modified_data || {};
          const erpData = modified.erp_data || {};

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
          const erpItems: ErpItem[] = modified.erp_items || [];
          const itemErrors: ErpItemError[] = Array.isArray(
            modified.erp_item_errors,
          )
            ? modified.erp_item_errors
            : [];
          const result: AnomalyResult = {
            anomalies,
            erpItems,
            itemErrors,
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
    [getOrderId, lang, resetCart, cartSettings.orderSuccessPages],
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

  const clearSubmitError = useCallback(() => {
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
    clearSubmitError,
  };
}
