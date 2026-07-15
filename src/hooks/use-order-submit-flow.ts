'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { get as pimGet } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { useCart } from '@contexts/cart/cart.context';
import { ensureActiveCart } from '@framework/cart/b2b-cart';
import { useCartSettings } from '@/hooks/use-cart-settings';
import { resolveOrderSuccessSlug } from '@/lib/erp/cart-config.types';
import {
  useOrderSubmit,
  type SubmitOpts,
  type SubmitOutcome,
  type AnomalyResult,
  type DuplicateWarning,
} from '@/hooks/use-order-submit';
import {
  orderSubmitFlowReducer,
  initialFlowState,
  copyTier,
  POLL_INTERVAL_MS,
  TICK_MS,
  MAX_POLL_FAILURES,
  SUCCESS_DWELL_MS,
  type FlowStatus,
  type Stage,
  type CopyTier,
} from '@/hooks/order-submit-flow.machine';

const INFLIGHT_KEY = 'vinc-b2b-submit-inflight';

export interface OrderSubmitFlowApi {
  status: FlowStatus;
  stage: Stage;
  copyTier: CopyTier;
  reconnecting: boolean;
  orderNumber?: string;
  errorMessage?: string;
  isSubmitting: boolean;
  open: (opts: SubmitOpts) => void;
  confirm: () => void;
  cancel: () => void;
  retry: () => void;
  close: () => void;
  // Passthrough for the existing anomaly / duplicate / already-submitted modals.
  anomalyResult: AnomalyResult | null;
  duplicateWarning: DuplicateWarning | null;
  orderAlreadySubmitted: { message?: string } | null;
  submitError: string | null;
  runAutofix: () => void;
  confirmDuplicate: () => void;
  clearAnomalies: () => void;
  clearDuplicateWarning: () => void;
  clearOrderAlreadySubmitted: () => void;
}

export function useOrderSubmitFlow(lang: string): OrderSubmitFlowApi {
  const [state, dispatch] = useReducer(
    orderSubmitFlowReducer,
    initialFlowState,
  );
  const { meta, resetCart } = useCart();
  const { settings: cartSettings } = useCartSettings();
  const submit = useOrderSubmit(lang);

  const optsRef = useRef<SubmitOpts | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failRef = useRef(0);
  const startedAtRef = useRef(0);

  const clearInflight = useCallback(() => {
    try {
      if (typeof window !== 'undefined')
        sessionStorage.removeItem(INFLIGHT_KEY);
    } catch {}
  }, []);

  const markInflight = useCallback((orderId: string) => {
    try {
      if (typeof window !== 'undefined')
        sessionStorage.setItem(INFLIGHT_KEY, orderId);
    } catch {}
  }, []);

  const beforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (typeof window !== 'undefined')
      window.removeEventListener('beforeunload', beforeUnload);
  }, [beforeUnload]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const startTick = useCallback(() => {
    startedAtRef.current = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      dispatch({ type: 'TICK', elapsedMs: Date.now() - startedAtRef.current });
    }, TICK_MS);
    if (typeof window !== 'undefined')
      window.addEventListener('beforeunload', beforeUnload);
  }, [beforeUnload]);

  const redirectToSuccess = useCallback(() => {
    if (typeof window === 'undefined') return;
    const slug = resolveOrderSuccessSlug(lang, cartSettings.orderSuccessPages);
    window.location.href = slug
      ? `/${lang}/${slug}`
      : `/${lang}/complete-order`;
  }, [lang, cartSettings.orderSuccessPages]);

  const finishSuccess = useCallback(
    async (orderNumber: string | undefined, resetTheCart: boolean) => {
      stopPoll();
      stopTick();
      clearInflight();
      dispatch({ type: 'SUCCESS', orderNumber });
      if (resetTheCart) {
        try {
          await resetCart(undefined, { deleteServer: false });
          await ensureActiveCart();
        } catch {
          // Non-fatal: the order is placed; a stale local cart self-heals on reload.
        }
      }
      successRef.current = setTimeout(redirectToSuccess, SUCCESS_DWELL_MS);
    },
    [stopPoll, stopTick, clearInflight, resetCart, redirectToSuccess],
  );

  const startPoll = useCallback(
    (orderId: string) => {
      failRef.current = 0;
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const res = await pimGet<any>(CS_CART.PROCESSING_STATUS(orderId));
          failRef.current = 0;
          if (res?.processing_status === 'completed') {
            await finishSuccess(
              res?.order_number ? String(res.order_number) : undefined,
              true,
            );
            return;
          }
          if (res?.processing_status === 'failed') {
            stopPoll();
            stopTick();
            clearInflight();
            const msg =
              (Array.isArray(res?.processing_errors) &&
                res.processing_errors.join(' · ')) ||
              "L'ordine non è stato completato. Controlla il carrello e riprova.";
            dispatch({ type: 'ERROR', message: msg });
            return;
          }
          dispatch({ type: 'SET_PHASE', phase: res?.processing_phase });
        } catch {
          failRef.current += 1;
          if (failRef.current >= MAX_POLL_FAILURES) {
            stopPoll();
            stopTick();
            dispatch({
              type: 'ERROR',
              message:
                'Connessione persa durante l’elaborazione. Ricarica la pagina per verificare lo stato dell’ordine.',
            });
          } else {
            dispatch({ type: 'RECONNECTING', value: true });
          }
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPoll, stopTick, clearInflight, finishSuccess],
  );

  const handleOutcome = useCallback(
    async (outcome: SubmitOutcome) => {
      switch (outcome.type) {
        case 'success':
          await finishSuccess(outcome.orderNumber, false);
          return;
        case 'processing':
          markInflight(outcome.orderId);
          dispatch({ type: 'ENTER_PROCESSING', orderId: outcome.orderId });
          startPoll(outcome.orderId);
          return;
        case 'anomalies':
        case 'duplicate_warning':
        case 'already_submitted':
          // The wrapped useOrderSubmit state is set; existing modals take over.
          stopTick();
          dispatch({ type: 'RESET' });
          return;
        case 'error':
          stopTick();
          dispatch({ type: 'ERROR', message: outcome.message });
          return;
      }
    },
    [finishSuccess, markInflight, startPoll, stopTick],
  );

  const run = useCallback(
    async (fn: (o: SubmitOpts) => Promise<SubmitOutcome>) => {
      const opts = optsRef.current;
      if (!opts) return;
      dispatch({ type: 'CONFIRM' });
      startTick();
      const outcome = await fn({ ...opts, redirectOnComplete: false });
      await handleOutcome(outcome);
    },
    [startTick, handleOutcome],
  );

  const open = useCallback((opts: SubmitOpts) => {
    optsRef.current = opts;
    dispatch({ type: 'OPEN' });
  }, []);

  const confirm = useCallback(() => {
    void run(submit.submitOrder);
  }, [run, submit.submitOrder]);

  const retry = useCallback(() => {
    void run(submit.submitOrder);
  }, [run, submit.submitOrder]);

  const runAutofix = useCallback(() => {
    void run(submit.resubmitWithAutofix);
  }, [run, submit.resubmitWithAutofix]);

  const confirmDuplicate = useCallback(() => {
    void run(submit.confirmDuplicateSubmit);
  }, [run, submit.confirmDuplicateSubmit]);

  const cancel = useCallback(() => {
    stopPoll();
    stopTick();
    dispatch({ type: 'CANCEL' });
  }, [stopPoll, stopTick]);

  const close = cancel;

  // Resume-on-reload: if a submit was in flight for THIS order, re-attach.
  useEffect(() => {
    const orderId = meta?.orderId;
    if (!orderId || typeof window === 'undefined') return;
    let marker: string | null = null;
    try {
      marker = sessionStorage.getItem(INFLIGHT_KEY);
    } catch {}
    if (marker !== orderId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await pimGet<any>(CS_CART.PROCESSING_STATUS(orderId));
        if (cancelled) return;
        if (res?.processing_status === 'processing') {
          dispatch({ type: 'ENTER_PROCESSING', orderId });
          dispatch({ type: 'SET_PHASE', phase: res?.processing_phase });
          startTick();
          startPoll(orderId);
        } else if (res?.processing_status === 'completed') {
          await finishSuccess(
            res?.order_number ? String(res.order_number) : undefined,
            true,
          );
        } else {
          clearInflight();
        }
      } catch {
        // Leave the marker; the next load can retry.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.orderId]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (successRef.current) clearTimeout(successRef.current);
      if (typeof window !== 'undefined')
        window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [beforeUnload]);

  return {
    status: state.status,
    stage: state.stage,
    copyTier: copyTier(state.elapsedMs),
    reconnecting: state.reconnecting,
    orderNumber: state.orderNumber,
    errorMessage: state.errorMessage,
    isSubmitting: submit.isSubmitting,
    open,
    confirm,
    cancel,
    retry,
    close,
    anomalyResult: submit.anomalyResult,
    duplicateWarning: submit.duplicateWarning,
    orderAlreadySubmitted: submit.orderAlreadySubmitted,
    submitError: submit.submitError,
    runAutofix,
    confirmDuplicate,
    clearAnomalies: submit.clearAnomalies,
    clearDuplicateWarning: submit.clearDuplicateWarning,
    clearOrderAlreadySubmitted: submit.clearOrderAlreadySubmitted,
  };
}
