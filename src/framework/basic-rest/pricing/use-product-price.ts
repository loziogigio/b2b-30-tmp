'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Product } from '@framework/types';
import { ERP_STATIC, hasValidErpContext } from '@framework/utils/static';
import { fetchErpPrices } from '@framework/erp/prices';
import { loadErpPrice } from './erp-price-batcher';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { productToErpPriceData } from '@utils/transform/inline-to-erp';

import { useThemeId } from '@/contexts/tenant.context';
import { useUI } from '@contexts/ui.context';
import { usePricingSource } from './use-pricing-source';
import type { PricingSource } from './pricing-source';

const STALE_MS = 5 * 60 * 1000;

interface SingleOptions {
  /** Caller-provided ERP slice. Wins over the active source. */
  override?: ErpPriceData;
  /** Disable the hook entirely (e.g. multi-variant parents). */
  enabled?: boolean;
  /** Qty hint when posting to the ERP endpoint. Defaults to 1. */
  quantity?: number;
}

interface BatchOptions {
  /** Map of entity_code → ERP slice provided by the caller (wins). */
  overrideMap?: Record<string, ErpPriceData>;
  enabled?: boolean;
  /** Optional per-entity qty hint, aligned with the input order. */
  quantities?: number[];
}

/**
 * Single-product pricing hook. Returns the ErpPriceData that downstream
 * UI (B2BOfferRows, AddToCart, PackagingGrid…) expects, regardless of
 * whether the data came from inline PIM pricing or the ERP API.
 *
 * Modes (see ./pricing-source.ts):
 *   - inline → synth from product.pricing, no network
 *   - erp    → fetch /erp/get_multiple_prices, ignore inline
 *   - hybrid → synth immediately; merge ERP overrides when available
 */
export function useProductPriceData(
  product: Product | null | undefined,
  options?: SingleOptions,
): ErpPriceData | undefined {
  const source = usePricingSource();
  const theme = useThemeId();
  const { isAuthorized } = useUI();
  const override = options?.override;
  const enabled = options?.enabled ?? true;
  const quantity = options?.quantity ?? 1;

  const entityCode = product?.id != null ? String(product.id) : '';
  const wantsErp = source === 'erp' || source === 'hybrid';
  // Anonymous visitors don't see prices, so never hit the ERP endpoint for them.
  const erpReady =
    enabled && isAuthorized && wantsErp && !override && hasValidErpContext();

  const erpQuery = useQuery({
    queryKey: erpQueryKey([entityCode], quantity, ERP_STATIC),
    // Goes through the batcher, NOT fetchErpPrices directly: this hook backs
    // every card/row/popup, so a grid of N products used to fire N separate
    // `get_multiple_prices` requests at an endpoint that already takes an
    // array. The batcher coalesces the codes mounted in one render pass into a
    // single request. The React Query entry stays per-code, so caching and
    // dedup across components are unchanged — only the network calls merge.
    queryFn: () =>
      loadErpPrice({
        entityCode,
        quantity,
        idCart: ERP_STATIC.id_cart,
        customerCode: ERP_STATIC.customer_code,
        addressCode: ERP_STATIC.address_code,
        theme,
      }),
    enabled: erpReady && Boolean(entityCode),
    staleTime: STALE_MS,
  });

  return useMemo<ErpPriceData | undefined>(() => {
    // Never expose caller-provided/customer-cached ERP data after logout.
    // Inline mode is public by design; ERP mode is always session-bound.
    if (override) {
      if (!isAuthorized && source === 'erp') return undefined;
      return override;
    }
    if (!product) return undefined;

    const synth = productToErpPriceData(product) ?? undefined;
    if (source === 'inline') return synth;

    // loadErpPrice resolves THIS product's slice directly (the batcher already
    // demultiplexed the shared response), so there is no map to index into.
    const erpSlice = entityCode ? erpQuery.data : undefined;
    if (source === 'erp') {
      return isAuthorized ? (erpSlice ?? undefined) : undefined;
    }

    // hybrid: synth as base, ERP overrides win for customer-specific
    // fields (net_price, discount, availability, label action, …).
    // Until ERP resolves we still render the synth so paint is instant;
    // if ERP fails the synth simply stays the source of truth.
    if (!isAuthorized || !erpSlice) return synth;
    return synth ? { ...synth, ...erpSlice } : erpSlice;
  }, [override, product, source, entityCode, erpQuery.data, isAuthorized]);
}

/**
 * Batch pricing hook for grid/list/carousel/compare surfaces. One ERP
 * roundtrip per stable product set. Returns a stable map keyed by
 * entity_code (string).
 */
export function useProductsPriceMap(
  products: ReadonlyArray<Product> | null | undefined,
  options?: BatchOptions,
): Record<string, ErpPriceData> {
  const source = usePricingSource();
  const theme = useThemeId();
  const { isAuthorized } = useUI();
  const overrideMap = options?.overrideMap;
  const enabled = options?.enabled ?? true;

  const list = useMemo<ReadonlyArray<Product>>(
    () => (Array.isArray(products) ? products : []),
    [products],
  );

  // Stable, deduped entity_codes for the React Query key. Sorted so two
  // grids with the same products in different orders share one cache.
  const { entityCodes, quantities } = useMemo(() => {
    const seen = new Set<string>();
    const codes: string[] = [];
    const qtys: number[] = [];
    list.forEach((p, idx) => {
      const code = p?.id != null ? String(p.id) : '';
      if (!code || seen.has(code)) return;
      seen.add(code);
      codes.push(code);
      qtys.push(options?.quantities?.[idx] ?? 1);
    });
    return { entityCodes: codes, quantities: qtys };
  }, [list, options?.quantities]);

  const wantsErp = source === 'erp' || source === 'hybrid';
  // Anonymous visitors don't see prices, so never hit the ERP endpoint for them.
  const erpReady =
    enabled &&
    isAuthorized &&
    wantsErp &&
    entityCodes.length > 0 &&
    hasValidErpContext();

  const erpQuery = useQuery({
    queryKey: erpQueryKey(entityCodes, quantities, ERP_STATIC),
    queryFn: () =>
      fetchErpPrices({
        entity_codes: entityCodes,
        quantity_list: quantities,
        id_cart: ERP_STATIC.id_cart,
        customer_code: ERP_STATIC.customer_code,
        address_code: ERP_STATIC.address_code,
        theme,
      }),
    enabled: erpReady,
    staleTime: STALE_MS,
  });

  return useMemo<Record<string, ErpPriceData>>(() => {
    const out: Record<string, ErpPriceData> = {};

    // Synth pass — always run unless mode is pure ERP. Provides the
    // fast-paint baseline and the fallback when ERP is unavailable.
    if (source !== 'erp') {
      for (const p of list) {
        const code = p?.id != null ? String(p.id) : '';
        if (!code) continue;
        const synth = productToErpPriceData(p);
        if (synth) out[code] = synth;
      }
    }

    // ERP pass — overlay when mode is erp/hybrid and data is available.
    if (isAuthorized && wantsErp && erpQuery.data) {
      for (const [code, slice] of Object.entries(erpQuery.data)) {
        const base = out[code];
        out[code] = base ? { ...base, ...slice } : slice;
      }
    }

    // An ERP/hybrid override may contain a previously cached customer slice.
    // Ignore it after logout; public inline overrides remain valid.
    if (overrideMap && (isAuthorized || !wantsErp)) {
      for (const [code, slice] of Object.entries(overrideMap)) {
        out[code] = slice;
      }
    }

    return out;
  }, [list, source, wantsErp, erpQuery.data, overrideMap, isAuthorized]);
}

/**
 * Stable React Query key. Includes the customer context so a tenant
 * impersonating a different customer doesn't see cached prices for the
 * previous one.
 */
function erpQueryKey(
  entityCodes: ReadonlyArray<string>,
  quantities: ReadonlyArray<number> | number,
  ctx: { id_cart: string; customer_code: string; address_code: string },
): unknown[] {
  return [
    'erp-prices',
    ctx.customer_code,
    ctx.address_code,
    ctx.id_cart,
    entityCodes.join(','),
    Array.isArray(quantities) ? quantities.join(',') : String(quantities),
  ];
}

export type { PricingSource };
