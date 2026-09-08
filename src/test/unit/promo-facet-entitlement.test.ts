import { describe, it, expect } from 'vitest';
import { filterPromoFacetByEntitlement } from '@/app/api/proxy/pim/[...path]/route';

// Buckets and counts are the real Solr state of vinc-bellieforti-com, 2026-09-08.
const response = () => ({
  data: {
    facet_results: {
      promo_code: [
        { value: '26-SETTEMBRE', count: 259, label: 'CANVASS SETTEMBRE' },
        { value: '26-PUGLIA', count: 224, label: 'PROMO PUGLIA' },
        { value: '26-TOSCANA', count: 199, label: 'PROMO TOSCANA' },
        { value: '26-FUORI TUTTO', count: 93, label: 'FUORI TUTTO' },
      ],
      brand_id: [{ value: 'b1', count: 10 }],
    },
  },
});

const ENTITLED_10407 = new Set(['26-FUORI TUTTO', '26-SETTEMBRE', 'IMPMIN']);

describe('filterPromoFacetByEntitlement', () => {
  it('keeps only the buckets the customer is entitled to', () => {
    const out = filterPromoFacetByEntitlement(response(), ENTITLED_10407);
    expect(out.data.facet_results.promo_code.map((f: any) => f.value)).toEqual([
      '26-SETTEMBRE',
      '26-FUORI TUTTO',
    ]);
  });

  it('leaves catalog-wide counts untouched', () => {
    const out = filterPromoFacetByEntitlement(response(), ENTITLED_10407);
    expect(out.data.facet_results.promo_code[0].count).toBe(259);
  });

  it('ignores entitled codes that are not indexed (IMPMIN)', () => {
    const out = filterPromoFacetByEntitlement(response(), ENTITLED_10407);
    expect(out.data.facet_results.promo_code).toHaveLength(2);
  });

  it('FAILS OPEN: null entitlement leaves every bucket in place', () => {
    const out = filterPromoFacetByEntitlement(response(), null);
    expect(out.data.facet_results.promo_code).toHaveLength(4);
  });

  it('an empty entitlement set is a real answer and empties the facet', () => {
    const out = filterPromoFacetByEntitlement(response(), new Set<string>());
    expect(out.data.facet_results.promo_code).toHaveLength(0);
  });

  it('never touches other facets', () => {
    const out = filterPromoFacetByEntitlement(response(), ENTITLED_10407);
    expect(out.data.facet_results.brand_id).toHaveLength(1);
  });

  it('tolerates a response with no facets at all', () => {
    expect(() =>
      filterPromoFacetByEntitlement({}, ENTITLED_10407),
    ).not.toThrow();
    expect(() =>
      filterPromoFacetByEntitlement(
        { data: { facet_results: {} } },
        ENTITLED_10407,
      ),
    ).not.toThrow();
  });

  it('reads the top-level facet_results shape too', () => {
    const flat = {
      facet_results: { promo_code: [{ value: '26-PUGLIA', count: 224 }] },
    };
    const out = filterPromoFacetByEntitlement(flat, ENTITLED_10407);
    expect(out.facet_results.promo_code).toHaveLength(0);
  });
});
