import { describe, it, expect } from 'vitest';
import { hasBrowsableCategoryTree } from '@/lib/pim/category-tree';
import {
  transformPimCategoriesTree,
  type PimCategoryNode,
} from '@framework/product/get-pim-categories';

/**
 * Fixtures mirror what `/api/public/categories` actually returns in production.
 *
 * `product_count` is 0 on every tenant sampled (the counter is not maintained),
 * so it can never be the deciding signal on its own — the shape of the tree and
 * the presence of an ERP `external_code` are what tell a real catalogue apart
 * from a placeholder.
 */
const pimCategory = (
  overrides: Partial<PimCategoryNode> & Pick<PimCategoryNode, 'category_id'>,
): PimCategoryNode => ({
  name: overrides.name ?? overrides.category_id,
  slug: overrides.slug ?? overrides.category_id,
  external_code: null,
  parent_id: null,
  level: 0,
  path: [],
  display_order: 0,
  product_count: 0,
  children: [],
  ...overrides,
});

/** bellieforti: one placeholder root, no ERP code, no children, no products. */
const BELLIEFORTI: PimCategoryNode[] = [
  pimCategory({
    category_id: '0',
    name: 'Prodotti',
    slug: 'prodotti-0',
    external_code: null,
  }),
];

/** baseprotection: a flat but real catalogue — four ERP-backed roots. */
const BASEPROTECTION: PimCategoryNode[] = [
  pimCategory({
    category_id: 'tTUXnE2qj6Hl',
    name: 'CALZATURE',
    slug: 'calzature',
    external_code: 'CALZ',
  }),
  pimCategory({
    category_id: '4bYJyY2HxabG',
    name: 'GUANTI',
    slug: 'guanti',
    external_code: 'GUAN',
  }),
  pimCategory({
    category_id: 'EYGEqL3lbqlz',
    name: 'ACCESSORI',
    slug: 'accessori',
    external_code: 'ACCE',
  }),
  pimCategory({
    category_id: 'idYKjfwtWjRf',
    name: 'PLANTARI A SUPPORTO VARIABILI',
    slug: 'plantari',
    external_code: 'PLAN',
  }),
];

/** A nested catalogue: one synthetic root the transform flattens away. */
const NESTED: PimCategoryNode[] = [
  pimCategory({
    category_id: 'root',
    name: 'Categorie',
    slug: 'categorie',
    children: [
      pimCategory({
        category_id: 'illuminazione',
        name: 'Illuminazione',
        slug: 'illuminazione',
        level: 1,
        children: [
          pimCategory({
            category_id: 'lampadine',
            name: 'Lampadine',
            slug: 'lampadine',
            level: 2,
          }),
        ],
      }),
    ],
  }),
];

describe('transformPimCategoriesTree', () => {
  it('carries product_count onto the transformed node', () => {
    const [node] = transformPimCategoriesTree([
      pimCategory({ category_id: 'guanti', product_count: 12 }),
    ]);

    expect(node.product_count).toBe(12);
  });
});

describe('hasBrowsableCategoryTree', () => {
  it('is false for an empty tree', () => {
    expect(hasBrowsableCategoryTree([])).toBe(false);
  });

  it('is false for a lone placeholder root that leads nowhere', () => {
    expect(
      hasBrowsableCategoryTree(transformPimCategoriesTree(BELLIEFORTI)),
    ).toBe(false);
  });

  it('is true for a flat catalogue of ERP-backed roots', () => {
    expect(
      hasBrowsableCategoryTree(transformPimCategoriesTree(BASEPROTECTION)),
    ).toBe(true);
  });

  it('is true for a nested catalogue', () => {
    expect(hasBrowsableCategoryTree(transformPimCategoriesTree(NESTED))).toBe(
      true,
    );
  });

  it('is true for a lone category that is ERP-backed', () => {
    const tree = transformPimCategoriesTree([
      pimCategory({
        category_id: 'calzature',
        name: 'CALZATURE',
        slug: 'calzature',
        external_code: 'CALZ',
      }),
    ]);

    expect(hasBrowsableCategoryTree(tree)).toBe(true);
  });

  it('is true for a lone category that actually holds products', () => {
    const tree = transformPimCategoriesTree([
      pimCategory({ category_id: 'guanti', product_count: 12 }),
    ]);

    expect(hasBrowsableCategoryTree(tree)).toBe(true);
  });

  it('is true whenever the tenant offers a choice between categories', () => {
    // Two bare categories with neither ERP code nor counts still make a usable
    // index — the guard only removes the "single dead entry" case.
    const tree = transformPimCategoriesTree([
      pimCategory({ category_id: 'a' }),
      pimCategory({ category_id: 'b' }),
    ]);

    expect(hasBrowsableCategoryTree(tree)).toBe(true);
  });

  // The sitemap has no transformed tree to hand — it reads the raw roots
  // straight from the PIM. Both shapes must reach the same verdict.
  it('reaches the same verdict on raw PIM roots as on the transformed tree', () => {
    for (const roots of [BELLIEFORTI, BASEPROTECTION, NESTED, []]) {
      expect(hasBrowsableCategoryTree(roots)).toBe(
        hasBrowsableCategoryTree(transformPimCategoriesTree(roots)),
      );
    }

    expect(hasBrowsableCategoryTree(BELLIEFORTI)).toBe(false);
    expect(hasBrowsableCategoryTree(BASEPROTECTION)).toBe(true);
    expect(hasBrowsableCategoryTree(NESTED)).toBe(true);
  });
});
