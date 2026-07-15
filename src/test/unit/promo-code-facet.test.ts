import { describe, it, expect } from 'vitest';
import {
  harvestPromoCodeLabels,
  resolveLabel,
} from '@/framework/basic-rest/product/get-pim-filters';

const docs = [
  {
    promotions: [
      { promo_code: '26-SUMMER', promo_type: 'STD', label: 'ESTATE 2026' },
      { promo_code: '26-FUORI TUTTO', promo_type: 'STD', label: 'FUORI TUTTO' },
    ],
  },
  {
    promotions: [
      {
        promo_code: '26-SUMMER',
        promo_type: 'STD',
        label: 'ESTATE 2026 (dup)',
      },
      { promo_code: '26-XMAS', promo_type: 'STD' }, // no label → skipped
      { promo_type: 'STD', label: 'orphan' }, // no code → skipped
    ],
  },
];

describe('harvestPromoCodeLabels', () => {
  it('builds a promo_code → label map, first-wins', () => {
    const map = harvestPromoCodeLabels(docs);
    expect(map['26-SUMMER']).toBe('ESTATE 2026'); // first-wins, not the "(dup)"
    expect(map['26-FUORI TUTTO']).toBe('FUORI TUTTO');
  });

  it('skips promotions missing a code or a label', () => {
    const map = harvestPromoCodeLabels(docs);
    expect(map['26-XMAS']).toBeUndefined();
    expect(Object.values(map)).not.toContain('orphan');
  });

  it('returns an empty map for missing/invalid docs', () => {
    expect(harvestPromoCodeLabels(undefined)).toEqual({});
    expect(harvestPromoCodeLabels([])).toEqual({});
  });
});

describe('resolveLabel for promo_code', () => {
  const map = { '26-SUMMER': 'ESTATE 2026' };

  it('prefers the harvested campaign label', () => {
    expect(resolveLabel('promo_code', '26-SUMMER', undefined, map)).toBe(
      'ESTATE 2026',
    );
  });

  it('falls back to the raw code when unmapped', () => {
    expect(resolveLabel('promo_code', '26-FUORI TUTTO', undefined, map)).toBe(
      '26-FUORI TUTTO',
    );
  });
});
