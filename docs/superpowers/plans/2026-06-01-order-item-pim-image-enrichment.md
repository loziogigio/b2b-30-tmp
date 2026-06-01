# Order-Detail Line-Item PIM Image Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill in product images on order-detail line items (VINC orders lack them) by batch-fetching the items' images from PIM in one search — the product-likes pattern.

**Architecture:** A shared client hook `useEnrichedOrderItems(items)` collects the `sku`s of image-less items, issues one `usePimProductListQuery({ filters: { sku } })`, builds a `sku → imageUrl` map, and returns items with `image` filled. Pure helpers (`imagelessSkus`, `mergeItemImages`) hold the logic and are unit-tested without React Query. The hook is self-limiting (ERP items already have images → query disabled → pass-through) and non-blocking (PIM error → items render imageless).

**Tech Stack:** React + React Query, TypeScript, Vitest. Spec: `docs/superpowers/specs/2026-06-01-order-item-pim-image-enrichment-design.md`.

**Conventions:** run one test file with `pnpm test <path>`; aliases `@framework/` → `src/framework/basic-rest/`, `@utils/` → `src/utils/`, `@components/` → `src/components/`, `@/` → `src/`; commit messages have **no** `Co-Authored-By`/`Generated with` lines; `--no-verify` if pre-existing lint blocks; never run `pnpm build`. The working tree has unrelated in-progress files — always `git add` exact paths, never `git add -A`.

---

## File Structure

**New**
- `src/framework/basic-rest/order/use-enriched-order-items.ts` — the hook + pure helpers (`imagelessSkus`, `mergeItemImages`). One responsibility: image-enrich a list of order items from PIM.
- `src/test/unit/enriched-order-items.test.ts` — unit tests for the pure helpers.

**Modified**
- `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx` — full order-detail page: call the hook (with the other hooks, before the early returns) and feed enriched items to `OrderItemsTable`.
- `src/components/orders/order-details.tsx` — orders-list right-panel summary card: compute raw items above the `if (!order)` guard, call the hook, feed enriched items to `OrderItemsTable`.

---

## Task 1: The enrichment hook + pure helpers (TDD on the helpers)

**Files:**
- Create: `src/framework/basic-rest/order/use-enriched-order-items.ts`
- Test: `src/test/unit/enriched-order-items.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/test/unit/enriched-order-items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  imagelessSkus,
  mergeItemImages,
} from '@framework/order/use-enriched-order-items';
import type { TransformedOrderItem } from '@utils/transform/b2b-order';

// minimal valid TransformedOrderItem with overrides
const item = (over: Partial<TransformedOrderItem>): TransformedOrderItem =>
  ({
    id: 1,
    name: 'x',
    price: 0,
    quantity: 1,
    sku: '',
    delivered_in_quantity: 0,
    ordered_in_quantity: 0,
    delivered_in_price: 0,
    ordered_in_price: 0,
    ...over,
  }) as TransformedOrderItem;

describe('imagelessSkus', () => {
  it('returns unique skus of items that lack an image and have a sku', () => {
    expect(
      imagelessSkus([
        item({ sku: 'A' }),
        item({ sku: 'B', image: 'u' }), // already has image → excluded
        item({ sku: 'A' }), // duplicate → deduped
        item({ sku: '' }), // no sku → excluded
      ]),
    ).toEqual(['A']);
  });

  it('returns [] when every item has an image (ERP case)', () => {
    expect(
      imagelessSkus([item({ sku: 'A', image: 'a' }), item({ sku: 'B', image: 'b' })]),
    ).toEqual([]);
  });
});

describe('mergeItemImages', () => {
  const bySku = new Map([
    ['A', 'imgA'],
    ['C', 'imgC'],
  ]);

  it('fills image only on matching image-less items', () => {
    const out = mergeItemImages(
      [
        item({ sku: 'A' }), // match → filled
        item({ sku: 'B' }), // no match → untouched
        item({ sku: 'A', image: 'keep' }), // already has image → not overwritten
      ],
      bySku,
    );
    expect(out[0].image).toBe('imgA');
    expect(out[1].image).toBeUndefined();
    expect(out[2].image).toBe('keep');
  });

  it('returns a new array and does not mutate inputs', () => {
    const input = [item({ sku: 'A' })];
    const out = mergeItemImages(input, bySku);
    expect(out).not.toBe(input);
    expect(input[0].image).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/test/unit/enriched-order-items.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation** — create `src/framework/basic-rest/order/use-enriched-order-items.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/test/unit/enriched-order-items.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/framework/basic-rest/order/use-enriched-order-items.ts src/test/unit/enriched-order-items.test.ts
git commit --no-verify -m "feat(order): useEnrichedOrderItems — batch PIM image enrichment for order items"
```

---

## Task 2: Wire the full order-detail page

**Files:**
- Modify: `src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx`

This component has early returns (`!params`, `isLoading`, `isError`, `!order`) before the main JSX, so the hook MUST be called with the other hooks, before those returns. It also already renders `OrderItemsTable` with `order.items ?? []`.

- [ ] **Step 1: Add the import**

After the existing `import { useOrderDetailsQuery } from '@framework/order/fetch-order';` line (line 5), add:

```ts
import { useEnrichedOrderItems } from '@framework/order/use-enriched-order-items';
```

- [ ] **Step 2: Call the hook with the other hooks (before the early returns)**

Find the `useOrderDetailsQuery` block:

```ts
  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useOrderDetailsQuery(params as any);
```

Immediately after it, add:

```ts
  const enrichedItems = useEnrichedOrderItems(order?.items ?? []);
```

(`order` may be undefined here; the hook handles an empty list by disabling the query. This keeps the hook call unconditional, satisfying the rules of hooks.)

- [ ] **Step 3: Feed enriched items to the table**

Find (around line 335):

```tsx
        <OrderItemsTable
          items={order.items ?? []}
          height={360}
          lang={lang}
        />
```

Replace `items={order.items ?? []}` with `items={enrichedItems}`:

```tsx
        <OrderItemsTable
          items={enrichedItems}
          height={360}
          lang={lang}
        />
```

- [ ] **Step 4: Verify the suite still passes**

Run: `pnpm test src/test/unit/enriched-order-items.test.ts`
Expected: PASS (sanity — the imported hook still resolves).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[lang]/(default)/account/order-detail/order-detail.client.tsx"
git commit --no-verify -m "feat(order): image-enrich items on the full order-detail page"
```

---

## Task 3: Wire the orders-list summary card

**Files:**
- Modify: `src/components/orders/order-details.tsx`

This component computes `items` AFTER an `if (!order) return …` guard. To call the hook unconditionally, move the raw-items computation above the guard (using optional chaining on `order`), call the hook there, then keep the guard.

- [ ] **Step 1: Add the import**

After `import AddressCard from './address-card';` (line 10), add:

```ts
import { useEnrichedOrderItems } from '@framework/order/use-enriched-order-items';
```

- [ ] **Step 2: Move items computation above the guard and enrich it**

The current code is:

```tsx
  if (!order) {
    return (
      <section className="rounded-2xl bg-white shadow-sm p-8 text-center text-sm text-gray-500">
        {t('orders-select-order')}
      </section>
    );
  }

  const items: TransformedOrderItem[] =
    (order as any).items ??
    (order as any).products?.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image?.thumbnail || p.image?.original,
      unit: p.unit,
      price: money(p.pivot?.unit_price ?? p.price),
      quantity: Number(p.pivot?.order_quantity ?? 1),
      reviewUrl: '#',
    })) ??
    [];
```

Replace that whole block with (raw items + hook BEFORE the guard):

```tsx
  const rawItems: TransformedOrderItem[] =
    (order as any)?.items ??
    (order as any)?.products?.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image?.thumbnail || p.image?.original,
      unit: p.unit,
      price: money(p.pivot?.unit_price ?? p.price),
      quantity: Number(p.pivot?.order_quantity ?? 1),
      reviewUrl: '#',
    })) ??
    [];
  const items = useEnrichedOrderItems(rawItems);

  if (!order) {
    return (
      <section className="rounded-2xl bg-white shadow-sm p-8 text-center text-sm text-gray-500">
        {t('orders-select-order')}
      </section>
    );
  }
```

(The `<OrderItemsTable items={items} lang={lang} />` further down is unchanged — it now receives the enriched list. Note the optional chaining `(order as any)?.` so `rawItems` is `[]` when `order` is null, before the guard returns.)

- [ ] **Step 3: Verify the suite still passes**

Run: `pnpm test src/test/unit/enriched-order-items.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/orders/order-details.tsx
git commit --no-verify -m "feat(order): image-enrich items on the orders-list summary card"
```

---

## Task 4: Manual verification (live app)

**Files:** none.

Like the orders feature, full confirmation needs the running app with a logged-in default-theme customer who has VINC orders (the auth-gated GUI). This step is observation, not tests.

- [ ] **Step 1: Run the suite**

Run: `pnpm test src/test/unit/enriched-order-items.test.ts`
Expected: PASS. (Pre-existing unrelated failures in `src/test/api/forms-submit-route.test.ts` are not introduced here.)

- [ ] **Step 2: Observe in the running app**

With `pnpm dev` running, log in as a default-theme customer with VINC orders → open an order → confirm:
- line items now show product images (network tab shows ONE `POST /api/proxy/pim/api/search/search` with `filters.sku` = the order's item SKUs);
- a line whose SKU has no PIM match still renders (imageless), and the page does not error;
- the orders-list right-panel summary card also shows item images.

- [ ] **Step 3: Confirm no extra calls on ERP orders**

On a theme whose order items already carry images (ERP), confirm NO `/api/proxy/pim/api/search/search` call fires for the items table (the hook's query is disabled when no item lacks an image).

---

## Self-Review (completed by plan author)

**Spec coverage:** §2 mechanism → Tasks 1–3. §3 hook (`imagelessSkus`/`mergeItemImages`/`useEnrichedOrderItems`, `image.original` fallback, sku key) → Task 1 (verbatim). §4 integration points (both components) → Tasks 2 & 3. §5 error/empty/edge (no overwrite, no-sku/has-image pass-through, dedupe, non-blocking via `data: []`) → Task 1 helpers + tests. §6 testing (merge unit-tested without React Query via pure helpers) → Task 1. §7 files → File Structure. §8 out-of-scope (images only, ERP untouched, no server merge) → respected; ERP no-op verified in Task 4 Step 3.

**Placeholder scan:** none — every code step shows full code; commands and expected results are concrete.

**Type consistency:** `imagelessSkus(items): string[]`, `mergeItemImages(items, bySku: Map<string,string>): TransformedOrderItem[]`, `useEnrichedOrderItems(items): TransformedOrderItem[]`, and the import path `@framework/order/use-enriched-order-items` are identical across Tasks 1–3. `TransformedOrderItem` (from `@utils/transform/b2b-order`) carries `image?`, `sku` — the fields the helpers read.

**Rules-of-hooks note (verified):** both components call `useEnrichedOrderItems` before any early `return` (Task 2 places it with the other hooks; Task 3 moves the raw-items computation + hook above the `!order` guard).
