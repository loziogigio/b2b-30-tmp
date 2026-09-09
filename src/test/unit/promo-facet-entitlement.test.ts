import { describe, it, expect } from 'vitest';
import {
  filterPromoFacetByEntitlement,
  GUEST_ENTITLEMENT,
  postProcessSearchResponse,
  readTrustedPair,
} from '@/app/api/proxy/pim/[...path]/route';

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

describe('postProcessSearchResponse — the filter must not hide behind promo_type', () => {
  // The storefront sidebar requests promo_code but never promo_type, so a
  // filter nested inside the promo_type label-enrichment guard never runs.
  // That is exactly what shipped in 2.9.51: Redis held zero
  // promo-entitlement keys after a day in production (2026-09-09).
  const promoCodeOnly = () => ({
    data: {
      facet_results: {
        promo_code: [
          { value: '26-SETTEMBRE', count: 259 },
          { value: '26-TOSCANA', count: 199 },
        ],
      },
    },
  });

  it('filters promo_code even when NO promo_type facet came back', () => {
    const out = postProcessSearchResponse(promoCodeOnly(), {
      promoMap: {},
      entitled: new Set(['26-SETTEMBRE']),
    });
    expect(out.data.facet_results.promo_code.map((f: any) => f.value)).toEqual([
      '26-SETTEMBRE',
    ]);
  });

  it('labels promo_type AND filters promo_code in the same pass', () => {
    const data = promoCodeOnly();
    data.data.facet_results = {
      ...data.data.facet_results,
      promo_type: [{ value: 'STD', count: 345 }],
    } as any;
    const out = postProcessSearchResponse(data, {
      promoMap: { STD: 'Standard' },
      entitled: new Set(['26-TOSCANA']),
    });
    expect(out.data.facet_results.promo_type[0].label).toBe('Standard');
    expect(out.data.facet_results.promo_code.map((f: any) => f.value)).toEqual([
      '26-TOSCANA',
    ]);
  });

  it('still fails open on a null entitlement', () => {
    const out = postProcessSearchResponse(promoCodeOnly(), {
      promoMap: {},
      entitled: null,
    });
    expect(out.data.facet_results.promo_code).toHaveLength(2);
  });
});

describe('readTrustedPair', () => {
  it('reads the pair the sanitizer wrote back', () => {
    expect(
      readTrustedPair(
        JSON.stringify({ customer_code: ' 10407 ', address_code: '1' }),
      ),
    ).toEqual({ customerCode: '10407', addressCode: '1' });
  });

  it('is empty for a guest body and for non-JSON', () => {
    expect(readTrustedPair(JSON.stringify({ text: 'BF02937' }))).toEqual({
      customerCode: '',
      addressCode: '',
    });
    expect(readTrustedPair('')).toEqual({ customerCode: '', addressCode: '' });
  });
});

describe('guests get no PROMOZIONE facet', () => {
  // A guest sees no prices, so a promo filter cannot pay off — and the bucket
  // names + counts are the campaign map (regions, sizes), which should not be
  // readable without a login. GUEST_ENTITLEMENT is an EMPTY set, not null:
  // null means "unknown, fail open and show everything", which is what a
  // failed ERP lookup must keep doing.
  it('is an empty set, so every bucket is stripped', () => {
    const out = filterPromoFacetByEntitlement(response(), GUEST_ENTITLEMENT);
    expect(out.data.facet_results.promo_code).toHaveLength(0);
  });

  it('is distinct from null — a failed lookup must still fail OPEN', () => {
    expect(GUEST_ENTITLEMENT).not.toBeNull();
    expect(GUEST_ENTITLEMENT.size).toBe(0);
    expect(
      filterPromoFacetByEntitlement(response(), null).data.facet_results
        .promo_code,
    ).toHaveLength(4);
  });

  it('leaves the other facets alone for guests', () => {
    const out = filterPromoFacetByEntitlement(response(), GUEST_ENTITLEMENT);
    expect(out.data.facet_results.brand_id).toHaveLength(1);
  });
});
