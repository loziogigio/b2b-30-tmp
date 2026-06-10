import { describe, it, expect } from 'vitest';
import type { DynamicBlock } from '@framework/types';
import { transformPimProduct } from '@framework/product/get-pim-product';

const block: DynamicBlock = {
  id: 'blk_01',
  lang: 'it',
  title: 'Brevetti',
  section: 1,
  order: 0,
  columns: 2,
  is_active: true,
  elements: [
    {
      id: 'e1',
      kind: 'image',
      media: { url: 'https://cdn.example/patent1.png', cdn_key: 'k1' },
      link: { href: 'https://patents.example/1', new_tab: true },
      description: 'Descrizione 1',
    },
    { id: 'e2', kind: 'text', text: 'Nota' },
  ],
};

function rawProduct(extra: Record<string, unknown> = {}) {
  return {
    id: '536914',
    sku: '536914',
    entity_code: '536914',
    name: 'Test Product',
    slug: 'test-product',
    ...extra,
  } as any;
}

describe('transformPimProduct — dynamic_blocks passthrough', () => {
  it('carries dynamic_blocks through unchanged when present', () => {
    const result = transformPimProduct(rawProduct({ dynamic_blocks: [block] }));
    expect(result.dynamic_blocks).toEqual([block]);
    expect(result.dynamic_blocks?.[0].elements).toHaveLength(2);
  });
  it('leaves dynamic_blocks undefined when the raw product has none', () => {
    const result = transformPimProduct(rawProduct());
    expect(result.dynamic_blocks).toBeUndefined();
  });
});
