'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { get as pimGet, post as pimPost } from '@framework/utils/httpPIM';
import { CS_CART } from '@framework/utils/api-endpoints-cs';
import { ERP_STATIC } from '@framework/utils/static';
import { useCart } from '@contexts/cart/cart.context';
import { ensureActiveCart } from '@framework/cart/b2b-cart';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ProcessingOrder {
  order_id: string;
  order_number?: string;
  cart_number?: number;
  status: string;
  processing_status?: 'processing' | 'completed' | 'failed';
  processing_phase?: 'before' | 'on';
  processing_errors?: string[];
  erp_data?: {
    anomalies?: any[];
    [k: string]: any;
  };
  items?: any[];
  subtotal_net?: number;
  order_total?: number;
  created_at?: string;
  submitted_at?: string;
}

const POLL_INTERVAL = 10_000; // 10 seconds

type HttpErrorSummary = {
  message: string;
  status?: number;
  code?: string;
  url?: string;
};

function summarizeHttpError(err: unknown): HttpErrorSummary {
  if (axios.isAxiosError(err)) {
    return {
      message: err.message,
      status: err.response?.status,
      code: err.code,
      url: err.config?.url,
    };
  }

  return {
    message: err instanceof Error ? err.message : String(err),
  };
}

function isCanceledRequest(err: unknown): boolean {
  return (
    axios.isCancel(err) ||
    (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useProcessingOrders() {
  const [orders, setOrders] = useState<ProcessingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getCart } = useCart();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProcessingOrders = useCallback(async () => {
    if (!ERP_STATIC.customer_code || !ERP_STATIC.address_code) return;
    setIsLoading(true);
    try {
      const res = await pimGet<any>(CS_CART.PROCESSING_ORDERS, {
        customer_code: ERP_STATIC.customer_code,
        address_code: ERP_STATIC.address_code,
      });
      setOrders(res.orders || []);
    } catch (err) {
      if (!isCanceledRequest(err)) {
        console.warn(
          '[processing-orders] fetch unavailable:',
          summarizeHttpError(err),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (orderId: string) => {
    try {
      const res = await pimGet<any>(CS_CART.PROCESSING_STATUS(orderId));
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                processing_status: res.processing_status,
                processing_phase: res.processing_phase,
                processing_errors: res.processing_errors,
                status: res.status || o.status,
                order_number: res.order_number || o.order_number,
              }
            : o,
        ),
      );
    } catch (err) {
      if (!isCanceledRequest(err)) {
        console.warn(
          '[processing-orders] status unavailable:',
          summarizeHttpError(err),
        );
      }
    }
  }, []);

  const revertToCart = useCallback(
    async (orderId: string) => {
      try {
        await pimPost(CS_CART.REVERT_TO_CART(orderId), {
          customer_code: ERP_STATIC.customer_code,
          address_code: ERP_STATIC.address_code,
        });
        await fetchProcessingOrders();
        await getCart('replace');
      } catch (err) {
        console.error(
          '[processing-orders] revertToCart error:',
          summarizeHttpError(err),
        );
      }
    },
    [fetchProcessingOrders, getCart],
  );

  const resubmitOrder = useCallback(
    async (orderId: string) => {
      try {
        await pimPost(CS_CART.RESUBMIT(orderId), {});
        await fetchProcessingOrders();
      } catch (err) {
        console.error(
          '[processing-orders] resubmit error:',
          summarizeHttpError(err),
        );
      }
    },
    [fetchProcessingOrders],
  );

  // Auto-poll every 10s when there are orders still processing
  const hasProcessing = orders.some(
    (o) => o.processing_status === 'processing',
  );

  useEffect(() => {
    if (!hasProcessing) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      orders
        .filter((o) => o.processing_status === 'processing')
        .forEach((o) => checkStatus(o.order_id));
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasProcessing, orders, checkStatus]);

  return {
    orders,
    isLoading,
    hasProcessing,
    fetchProcessingOrders,
    checkStatus,
    revertToCart,
    resubmitOrder,
  };
}
