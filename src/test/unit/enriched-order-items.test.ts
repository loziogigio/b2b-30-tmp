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
