'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AnomalyResult } from '@/hooks/use-order-submit';
import { formatAnomalyFlags } from '@/hooks/use-order-submit';

export interface AnomalyForRow {
  idRiga: number;
  message: string;
  /** Entity code / SKU of the affected product, when we can resolve it */
  entityCode?: string;
}

interface CartAnomaliesContextValue {
  result: AnomalyResult | null;
  /** Flattened per-entity lookup: entity_code -> array of anomaly messages */
  byEntityCode: Record<string, string[]>;
  /** Flattened per-row lookup: IdRiga -> array of anomaly messages */
  byIdRiga: Record<number, string[]>;
  setAnomalies: (result: AnomalyResult | null) => void;
  clear: () => void;
}

const CartAnomaliesContext = createContext<CartAnomaliesContextValue | undefined>(
  undefined,
);

export function CartAnomaliesProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnomalyResult | null>(null);

  const { byEntityCode, byIdRiga } = useMemo(() => {
    const byCode: Record<string, string[]> = {};
    const byRow: Record<number, string[]> = {};
    if (!result) return { byEntityCode: byCode, byIdRiga: byRow };
    for (const a of result.anomalies) {
      const msg = formatAnomalyFlags(a);
      const erpItem = result.erpItems.find((i) => i.erp_line_number === a.IdRiga);
      const code = erpItem?.erp_data?.oarti
        ? String(erpItem.erp_data.oarti)
        : undefined;
      if (code) {
        (byCode[code] ||= []).push(msg);
      }
      (byRow[a.IdRiga] ||= []).push(msg);
    }
    return { byEntityCode: byCode, byIdRiga: byRow };
  }, [result]);

  const setAnomalies = useCallback(
    (r: AnomalyResult | null) => setResult(r),
    [],
  );
  const clear = useCallback(() => setResult(null), []);

  const value = useMemo(
    () => ({ result, byEntityCode, byIdRiga, setAnomalies, clear }),
    [result, byEntityCode, byIdRiga, setAnomalies, clear],
  );

  return (
    <CartAnomaliesContext.Provider value={value}>
      {children}
    </CartAnomaliesContext.Provider>
  );
}

export function useCartAnomalies(): CartAnomaliesContextValue {
  const ctx = useContext(CartAnomaliesContext);
  if (!ctx) {
    // Graceful fallback so components used outside the provider (e.g. saved carts)
    // keep working without anomaly integration.
    return {
      result: null,
      byEntityCode: {},
      byIdRiga: {},
      setAnomalies: () => {},
      clear: () => {},
    };
  }
  return ctx;
}
