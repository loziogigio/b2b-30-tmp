import { describe, it, expect } from 'vitest';

import { erpQueryKey } from '@framework/pricing/use-product-price';

/**
 * Regression coverage for the ERP price-visualization bug.
 *
 * useProductPriceData (single) caches a bare ErpPriceData *slice*, while
 * useProductsPriceMap (batch) caches a *map* of entity_code → slice. For a
 * one-product batch both hooks build a key from the same codes/qty/context, so
 * without a shape discriminator they collided in the React Query cache: the map
 * hook read a bare slice via Object.entries and surfaced no price (an empty `—`
 * cell) after the overlay had populated the single-hook cache. These tests lock
 * in that the two hooks NEVER share a cache key for the same product.
 */
const ctx = { id_cart: '0', customer_code: '5300', address_code: '1' };

describe('erpQueryKey — single/batch namespacing', () => {
  it('single and batch keys differ for the same single code', () => {
    const single = erpQueryKey('single', ['52365'], 1, ctx);
    const batch = erpQueryKey('batch', ['52365'], [1], ctx);
    expect(single).not.toEqual(batch);
  });

  it('embeds the mode as a distinct key segment', () => {
    const single = erpQueryKey('single', ['52365'], 1, ctx);
    const batch = erpQueryKey('batch', ['52365'], [1], ctx);
    expect(single[1]).toBe('single');
    expect(batch[1]).toBe('batch');
    // Everything except the mode segment is identical, proving the ONLY thing
    // keeping the caches disjoint is the discriminator.
    expect([single[0], ...single.slice(2)]).toEqual([
      batch[0],
      ...batch.slice(2),
    ]);
  });

  it('still keys by customer context so impersonation cannot leak prices', () => {
    const a = erpQueryKey('batch', ['52365'], [1], ctx);
    const b = erpQueryKey('batch', ['52365'], [1], {
      ...ctx,
      customer_code: '9999',
    });
    expect(a).not.toEqual(b);
  });

  it('is stable for identical inputs (cache hits still work)', () => {
    const a = erpQueryKey('batch', ['52365', '60256'], [1, 1], ctx);
    const b = erpQueryKey('batch', ['52365', '60256'], [1, 1], ctx);
    expect(a).toEqual(b);
  });
});
