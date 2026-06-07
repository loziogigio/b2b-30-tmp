import { describe, it, expect } from 'vitest';
import {
  orderFacets,
  facetFieldsToRequest,
  resolveFacetFieldsToFetch,
} from '@/components/search/facet-order';
import {
  DEFAULT_FACET_ORDER,
  PIM_FACET_FIELDS,
} from '@/framework/basic-rest/utils/filters';

const raw = [
  { key: 'brand_id', label: 'Marca', values: [{ value: '1' }] },
  { key: 'category_ancestors', label: 'Categoria', values: [{ value: 'c' }] },
  { key: 'stock_status', label: 'Disp', values: [{ value: 'in_stock' }] },
  { key: 'has_active_promo', label: 'Promo', values: [{ value: 'true' }] },
];

describe('orderFacets', () => {
  it('falls back to default order when no config', () => {
    const out = orderFacets(raw, undefined);
    expect(out.map((f) => f.key)).toEqual([
      'brand_id',
      'category_ancestors',
      'stock_status',
    ]);
  });

  it('respects config order and visibility', () => {
    const cfg = {
      entries: [
        { field: 'stock_status', visible: true },
        { field: 'brand_id', visible: true },
        { field: 'category_ancestors', visible: false },
      ],
    };
    const out = orderFacets(raw, cfg);
    expect(out.map((f) => f.key)).toEqual(['stock_status', 'brand_id']);
  });

  it('skips unknown/absent config fields without throwing', () => {
    const cfg = {
      entries: [
        { field: 'does_not_exist', visible: true },
        { field: 'brand_id', visible: true },
      ],
    };
    const out = orderFacets(raw, cfg);
    expect(out.map((f) => f.key)).toEqual(['brand_id']);
  });

  it('falls back to default when config has empty entries', () => {
    const out = orderFacets(raw, { entries: [] });
    expect(out.map((f) => f.key)).toEqual([
      'brand_id',
      'category_ancestors',
      'stock_status',
    ]);
  });
});

describe('facetFieldsToRequest', () => {
  it('returns visible configured field keys in order', () => {
    const cfg = {
      entries: [
        { field: 'stock_status', visible: true },
        { field: 'brand_id', visible: false },
        { field: 'category_ancestors', visible: true },
      ],
    };
    expect(facetFieldsToRequest(cfg)).toEqual([
      'stock_status',
      'category_ancestors',
    ]);
  });

  it('falls back to DEFAULT_FACET_ORDER when no/empty config', () => {
    expect(facetFieldsToRequest(undefined)).toEqual(DEFAULT_FACET_ORDER);
    expect(facetFieldsToRequest({ entries: [] })).toEqual(DEFAULT_FACET_ORDER);
  });
});

describe('resolveFacetFieldsToFetch', () => {
  it('returns exactly PIM_FACET_FIELDS when no config (zero regression)', () => {
    const out = resolveFacetFieldsToFetch(undefined);
    expect(new Set(out)).toEqual(new Set(PIM_FACET_FIELDS));
    expect(out).toHaveLength(PIM_FACET_FIELDS.length);
  });

  it('returns PIM_FACET_FIELDS when config has empty entries', () => {
    const out = resolveFacetFieldsToFetch({ entries: [] });
    expect(new Set(out)).toEqual(new Set(PIM_FACET_FIELDS));
  });

  it('adds a visible dynamic field to the union without duplicates', () => {
    const cfg = {
      entries: [
        { field: 'spec_color_s', visible: true },
        { field: 'brand_id', visible: true }, // already in PIM_FACET_FIELDS
      ],
    };
    const out = resolveFacetFieldsToFetch(cfg);
    // Contains all of PIM_FACET_FIELDS
    for (const f of PIM_FACET_FIELDS) {
      expect(out).toContain(f);
    }
    // Contains the dynamic field
    expect(out).toContain('spec_color_s');
    // No duplicates
    expect(out).toHaveLength(new Set(out).size);
    // brand_id (already present) was not duplicated
    expect(out.filter((f) => f === 'brand_id')).toHaveLength(1);
    // Exactly one field added beyond the static list
    expect(out).toHaveLength(PIM_FACET_FIELDS.length + 1);
  });

  it('excludes hidden entries from the added set', () => {
    const cfg = {
      entries: [
        { field: 'spec_hidden_s', visible: false },
        { field: 'attribute_material_s', visible: true },
      ],
    };
    const out = resolveFacetFieldsToFetch(cfg);
    expect(out).not.toContain('spec_hidden_s');
    expect(out).toContain('attribute_material_s');
  });
});
