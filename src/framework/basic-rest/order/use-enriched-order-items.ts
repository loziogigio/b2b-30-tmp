import { useMemo } from 'react';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import type { TransformedOrderItem } from '@utils/transform/b2b-order';

/** Unique skus of items that need an image (no image yet + have a sku). Pure. */
export function imagelessSkus(items: TransformedOrderItem[]): string[] {
  return Array.from(
    new Set(items.filter((i) => !i.image && i.sku).map((i) => i.sku)),
  );
}

/**
 * Fill `image` on image-less items from a sku→url map. Pure; returns a new
 * array, never mutates inputs, never overwrites an existing image.
 */
export function mergeItemImages(
  items: TransformedOrderItem[],
  bySku: Map<string, string>,
): TransformedOrderItem[] {
  return items.map((it) =>
    it.image || !it.sku || !bySku.has(it.sku)
      ? it
      : { ...it, image: bySku.get(it.sku) },
  );
}

/**
 * Image-enrich order line items from PIM in one batched search (the product-
 * likes pattern). Pass-through for items that already have an image or lack a
 * sku (e.g. ERP orders, whose items already carry images). Never throws — on a
 * PIM error the items render imageless (unchanged behavior).
 */
export function useEnrichedOrderItems(
  items: TransformedOrderItem[],
): TransformedOrderItem[] {
  const skus = useMemo(() => imagelessSkus(items), [items]);

  const { data: products = [] } = usePimProductListQuery(
    { filters: { sku: skus }, limit: skus.length },
    { enabled: skus.length > 0 },
  );

  const bySku = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      const url = (p as any).image?.original || (p as any).image?.thumbnail;
      if (p.sku && url) m.set(p.sku, url);
    }
    return m;
  }, [products]);

  return useMemo(() => mergeItemImages(items, bySku), [items, bySku]);
}
