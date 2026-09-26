'use client';

import * as React from 'react';
import type { ListProductSnapshot } from '@framework/types';

const STORAGE_KEY = 'vinc-compare-products';

export interface ShownCompareProduct {
  sku: string;
  snapshot: ListProductSnapshot;
}

function readSaved(): Record<string, ListProductSnapshot> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * How each compared product looked the last time the comparison showed it, so
 * a product the catalog drops stays listed, greyed out, with its name and
 * photo. Kept in the browser like the compare list, for listed SKUs only.
 */
export function useCompareSnapshots(
  skus: string[],
  shown: ShownCompareProduct[],
): Record<string, ListProductSnapshot> {
  const [snapshots, setSnapshots] = React.useState<
    Record<string, ListProductSnapshot>
  >({});
  const lastSerialized = React.useRef('');

  React.useEffect(() => {
    // The list is empty until it loads from storage: pruning to it now would
    // lose every saved snapshot.
    if (skus.length === 0) return;

    const saved = readSaved();
    const next: Record<string, ListProductSnapshot> = {};
    for (const sku of skus) {
      if (saved[sku]) next[sku] = saved[sku];
    }
    for (const { sku, snapshot } of shown) next[sku] = snapshot;

    // Unchanged content: no re-render, no write.
    const serialized = JSON.stringify(next);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    setSnapshots(next);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Storage blocked or full: the greyed-out card falls back to the SKU.
    }
  }, [skus, shown]);

  return snapshots;
}
