import { describe, it, expect } from 'vitest';
import {
  imagelessEntityCodes,
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

describe('imagelessEntityCodes', () => {
  it('returns unique entity_codes of items that lack an image and have one', () => {
    expect(
      imagelessEntityCodes([
        item({ entityCode: '104131' }),
        item({ entityCode: '005318', image: 'u' }), // already has image → excluded
        item({ entityCode: '104131' }), // duplicate → deduped
        item({ entityCode: undefined }), // no entityCode → excluded
      ]),
    ).toEqual(['104131']);
  });

  it('returns [] when every item has an image (ERP case)', () => {
    expect(
      imagelessEntityCodes([
        item({ entityCode: '1', image: 'a' }),
        item({ entityCode: '2', image: 'b' }),
      ]),
    ).toEqual([]);
  });
});

describe('mergeItemImages', () => {
  const byCode = new Map([
    ['104131', 'imgA'],
    ['999', 'imgC'],
  ]);

  it('fills image only on matching image-less items (by entityCode)', () => {
    const out = mergeItemImages(
      [
        item({ entityCode: '104131' }), // match → filled
        item({ entityCode: '222' }), // no match → untouched
        item({ entityCode: '104131', image: 'keep' }), // already has image → not overwritten
      ],
      byCode,
    );
    expect(out[0].image).toBe('imgA');
    expect(out[1].image).toBeUndefined();
    expect(out[2].image).toBe('keep');
  });

  it('returns a new array and does not mutate inputs', () => {
    const input = [item({ entityCode: '104131' })];
    const out = mergeItemImages(input, byCode);
    expect(out).not.toBe(input);
    expect(input[0].image).toBeUndefined();
  });
});
