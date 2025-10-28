'use client';

import * as React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';

const STORAGE_KEY = 'hidros-compare-skus';

export interface CompareContextState {
  skus: string[];
  addSku: (sku: string) => void;
  removeSku: (sku: string) => void;
  clear: () => void;
  hasSku: (sku: string) => boolean;
}

const CompareContext = React.createContext<CompareContextState | undefined>(undefined);
CompareContext.displayName = 'CompareContext';

export function useCompareList() {
  const context = React.useContext(CompareContext);
  if (!context) {
    throw new Error('useCompareList must be used within a CompareProvider');
  }
  return context;
}

export function CompareProvider({ children }: React.PropsWithChildren) {
  const [saved, save] = useLocalStorage(STORAGE_KEY, '[]');
  const [skus, setSkus] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (Array.isArray(parsed)) {
        setSkus(parsed.filter((value) => typeof value === 'string' && value.trim().length > 0));
      } else {
        setSkus([]);
      }
    } catch {
      setSkus([]);
    }
  }, [saved]);

  const persist = React.useCallback(
    (updater: (previous: string[]) => string[]) => {
      setSkus((previous) => {
        const next = updater(previous);
        try {
          save(JSON.stringify(next));
        } catch {
          // Ignore storage failures
        }
        return next;
      });
    },
    [save]
  );

  const addSku = React.useCallback(
    (sku: string) => {
      if (!sku) return;
      persist((previous) => {
        if (previous.includes(sku)) return previous;
        return [...previous, sku];
      });
    },
    [persist]
  );

  const removeSku = React.useCallback(
    (sku: string) => {
      persist((previous) => previous.filter((value) => value !== sku));
    },
    [persist]
  );

  const clear = React.useCallback(() => {
    persist(() => []);
  }, [persist]);

  const hasSku = React.useCallback((sku: string) => skus.includes(sku), [skus]);

  const value = React.useMemo<CompareContextState>(
    () => ({
      skus,
      addSku,
      removeSku,
      clear,
      hasSku
    }),
    [skus, addSku, removeSku, clear, hasSku]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
