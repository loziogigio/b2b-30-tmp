import { useMemo } from 'react';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import type { TransformedOrderItem } from '@utils/transform/b2b-order';

/**
 * Unique entity_codes of items that need an image (no image yet + have an
 * entityCode). Pure.
 *
 * Order line items identify their product by entity_code (the ERP article
 * code). PIM's own `sku` field is a different value, so we must match on
 * entity_code — searching PIM by `sku` returns nothing for these items.
 */
export function imagelessEntityCodes(items: TransformedOrderItem[]): string[] {
  return Array.from(
    new Set(
      items
        .filter((i) => !i.image && i.entityCode)
        .map((i) => i.entityCode as string),
    ),
  );
}

/**
 * Fill `image` on image-less items from an entity_code→url map. Pure; returns a
 * new array, never mutates inputs, never overwrites an existing image.
 */
export function mergeItemImages(
  items: TransformedOrderItem[],
  byCode: Map<string, string>,
): TransformedOrderItem[] {
  return items.map((it) =>
    it.image || !it.entityCode || !byCode.has(it.entityCode)
      ? it
      : { ...it, image: byCode.get(it.entityCode) },
  );
}

/**
 * Image-enrich order line items from PIM in one batched search.
 *
 * Items carry an entity_code (PIM's `sku` differs from the ERP entity_code), so
 * we query PIM by entity_code and key images on the transformed product `id`
 * (which `transformPimProduct` sets to `entity_code`). Pass-through for items
 * that already have an image or lack an entity_code (e.g. ERP orders, whose
 * items already carry images). Never throws — on a PIM error the items render
 * imageless (unchanged behavior).
 */
export function useEnrichedOrderItems(
  items: TransformedOrderItem[],
): TransformedOrderItem[] {
  const codes = useMemo(() => imagelessEntityCodes(items), [items]);

  const { data: products = [] } = usePimProductListQuery(
    { filters: { entity_code: codes }, limit: codes.length },
    { enabled: codes.length > 0 },
  );

  const byCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      const url = (p as any).image?.original || (p as any).image?.thumbnail;
      const code = (p as any).id ?? (p as any).entity_code;
      if (code && url) m.set(String(code), url);
    }
    return m;
  }, [products]);

  return useMemo(() => mergeItemImages(items, byCode), [items, byCode]);
}
