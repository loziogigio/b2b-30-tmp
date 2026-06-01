# Order-Detail Line-Item PIM Image Enrichment

- **Date:** 2026-06-01
- **Status:** Approved design — pending spec review
- **Branch context:** `feature/pim-inline-pricing`
- **Relation:** completes the per-line item enrichment deferred in
  `2026-06-01-vinc-profile-orders.md` (§6.1.2) — that plan added the VINC order
  detail but left line items without product images.

## 1. Summary

VINC `historical_order` line items carry `sku` / `entity_code` / `name` / qty /
price but **no product image** (`transformVincItem` sets `image: undefined`). We
enrich each order-detail line item with its **PIM product image**, fetched in a
**single batched PIM search** over the items' `sku`s — the same pattern the
product-likes feature uses to resolve a set of SKUs to full PIM products in one
call.

Scope is **images only** ("mostly the image"). Nothing else about the items
changes.

## 2. Mechanism (mirrors product likes)

Likes resolves a set of liked SKUs to full PIM products via one
`usePimProductListQuery({ filters: { sku: [...] } })` call
(`src/components/product/feeds/liked-products-products-carousel.tsx`). We reuse
that exact path for order line items.

```
order-detail.client.tsx  /  order-details.tsx   (both render OrderItemsTable)
   const items = order.items
        │
        ▼
   useEnrichedOrderItems(items)              ← NEW shared hook
        • skus = unique( items where !image && sku → item.sku )   ← self-limiting
        • usePimProductListQuery(
              { filters: { sku: skus }, limit: skus.length },
              { enabled: skus.length > 0 } )
        • build Map<sku, imageUrl>  from results
        • return items.map(it => it.image || !bySku.has(it.sku)
              ? it
              : { ...it, image: bySku.get(it.sku) })
        │
        ▼
   <OrderItemsTable items={enrichedItems} … />
```

- **Self-limiting / source-agnostic.** Only items that lack an `image` and have a
  `sku` are queried. ERP order items already carry an `image`
  (`transformOrderItem` maps `row.image`), so for ERP orders `skus` is empty, the
  query is disabled, and the hook is a pass-through. No theme branching needed.
- **One batched call** for the whole order's items (dedup SKUs first).
- **Key = `sku`.** Proven by likes; the VINC items carry `sku`. (`entity_code`
  is not a verified PIM search filter, so we don't use it.)
- **Image URL** = the transformed PIM `product.image.original`
  (fallback `product.image.thumbnail`). `OrderItemsTable` already runs
  `prefixImageUrl(it.image, 'gallery_') ?? it.image`, deriving the gallery
  variant exactly as product cards do — so setting `image` to the original URL is
  sufficient.

## 3. The hook

**File:** `src/framework/basic-rest/order/use-enriched-order-items.ts` (new)

```ts
import { useMemo } from 'react';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import type { TransformedOrderItem } from '@utils/transform/b2b-order';

/** Unique skus of items that need an image. Pure. */
export function imagelessSkus(items: TransformedOrderItem[]): string[] {
  return Array.from(
    new Set(items.filter((i) => !i.image && i.sku).map((i) => i.sku)),
  );
}

/** Fill `image` on image-less items from a sku→url map. Pure; returns a new array. */
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
 * Fill in each order line item's product image from PIM, batched in one search.
 * Pass-through for items that already have an image or lack a sku (e.g. ERP
 * orders, whose items already carry images). Never throws — on PIM error the
 * items render imageless (unchanged behavior).
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
```

## 4. Integration points

Wrap `order.items` through the hook before passing to `OrderItemsTable`:

- `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx`
  — the full detail page's items table.
- `src/components/orders/order-details.tsx` — the orders-list right-panel
  summary card's items table.

Both currently render `<OrderItemsTable items={(order…).items ?? []} … />`. They
compute `const enrichedItems = useEnrichedOrderItems(order.items ?? [])` and pass
`enrichedItems` instead. (`order-details.tsx` has an `items` fallback that maps
`products`; the hook receives whatever array is currently passed to the table.)

## 5. Error / empty / edge handling

- PIM search error or zero matches → affected lines render without an image
  (unchanged from today). The hook never throws and never blocks the order
  detail. (`usePimProductListQuery` returns `data: []` on error via its query;
  the carousel uses the same hook and degrades the same way.)
- Items with an image already (ERP) or no `sku` → returned untouched.
- Duplicate SKUs across lines → deduped before the query; the `Map` fills all
  matching lines.

## 6. Testing

Unit-test the **merge logic** (pure part), with `usePimProductListQuery` mocked
to return a fixed product list:

- fills `image` on an image-less item whose `sku` matches a PIM result;
- leaves an item that already has an `image` untouched (no overwrite);
- leaves an item whose `sku` has no PIM match untouched (still imageless);
- emits a query enabled only when there is ≥1 image-less sku (ERP/all-имage case
  → disabled, pass-through);
- dedupes SKUs in the query input.

(Test via a thin render-hook or by extracting the pure merge into a testable
helper `mergeItemImages(items, bySku)` that the hook calls — preferred, so the
merge is unit-tested without React Query.)

## 7. Files

**New**
- `src/framework/basic-rest/order/use-enriched-order-items.ts` — the hook (+ a
  pure `mergeItemImages` helper for testing).
- `src/test/unit/enriched-order-items.test.ts` — merge-logic tests.

**Modified**
- `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx`
- `src/components/orders/order-details.tsx`

## 8. Out of scope

- Other PIM fields on the line (brand, specs, upgraded link/slug) — images only.
- ERP order items (already have images).
- Standalone product-detail-page enrichment / correlations (separate concern).
- Server-side merge (rejected: would duplicate the PIM search path).
