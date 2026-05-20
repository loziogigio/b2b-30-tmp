import { describe, it, expect } from 'vitest';
import {
  buildCatalogueIndexModel,
  leafCount,
  CATALOGUE_ACCENT_PALETTE,
} from '@components/themes/time/category/build-catalogue-index-model';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    isGroup: (p.children?.length ?? 0) > 0,
    children: [],
    ...p,
  } as MenuTreeNode;
}

// macroA: all-leaf children (2 leaves)
const macroA = node({
  id: 'a',
  slug: 'valvolame',
  label: 'Valvolame',
  path: ['valvolame'],
  description: '<p>Valvole e raccordi</p>',
  children: [
    node({
      id: 'a1',
      slug: 'valvole',
      label: 'Valvole',
      path: ['valvolame', 'valvole'],
    }),
    node({
      id: 'a2',
      slug: 'raccordi',
      label: 'Raccordi',
      path: ['valvolame', 'raccordi'],
    }),
  ],
});

// macroB: 1 direct leaf + 1 sub-group (with 2 leaves)
const macroB = node({
  id: 'b',
  slug: 'edilizia',
  label: 'Edilizia',
  path: ['edilizia'],
  children: [
    node({
      id: 'b0',
      slug: 'generale',
      label: 'Generale',
      path: ['edilizia', 'generale'],
    }),
    node({
      id: 'bg',
      slug: 'segnaletica',
      label: 'Segnaletica',
      path: ['edilizia', 'segnaletica'],
      children: [
        node({
          id: 'bg1',
          slug: 'cartelli',
          label: 'Cartelli',
          path: ['edilizia', 'segnaletica', 'cartelli'],
        }),
        node({
          id: 'bg2',
          slug: 'guanti',
          label: 'Guanti',
          path: ['edilizia', 'segnaletica', 'guanti'],
        }),
      ],
    }),
  ],
});

const tree: MenuTreeNode[] = [macroA, macroB];

describe('unit: leafCount', () => {
  it('counts a leaf as 1', () => {
    expect(leafCount(node({ id: 'x', slug: 'x', path: ['x'] }))).toBe(1);
  });
  it('counts leaf descendants recursively', () => {
    expect(leafCount(macroB)).toBe(3); // generale + cartelli + guanti
  });
});

describe('unit: buildCatalogueIndexModel (root)', () => {
  const model = buildCatalogueIndexModel(tree, null, 'it', 'Tutti i gruppi');

  it('creates one section per top-level group', () => {
    expect(model.sections.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('renders an all-leaf macro as a single unnamed group', () => {
    const a = model.sections[0];
    expect(a.groups).toHaveLength(1);
    expect(a.groups[0].name).toBeNull();
    expect(a.groups[0].items.map((i) => i.label)).toEqual([
      'Valvole',
      'Raccordi',
    ]);
  });

  it('links leaves to the category route', () => {
    expect(model.sections[0].groups[0].items[0].href).toBe(
      '/it/categorie/valvolame/valvole',
    );
  });

  it('partitions direct leaves and sub-groups within a macro', () => {
    const b = model.sections[1];
    expect(b.groups[0].name).toBeNull();
    expect(b.groups[0].items.map((i) => i.label)).toEqual(['Generale']);
    expect(b.groups[1].name).toBe('Segnaletica');
    expect(b.groups[1].count).toBe(2);
    expect(b.groups[1].items.map((i) => i.label)).toEqual([
      'Cartelli',
      'Guanti',
    ]);
  });

  it('computes leaf counts and totals', () => {
    expect(model.sections[0].count).toBe(2);
    expect(model.sections[1].count).toBe(3);
    expect(model.totalGroups).toBe(2);
    expect(model.totalLeaves).toBe(5);
  });

  it('strips HTML from the subtitle', () => {
    expect(model.sections[0].subtitle).toBe('Valvole e raccordi');
  });

  it('cycles the accent palette by section index', () => {
    expect(model.sections[0].accent).toBe(CATALOGUE_ACCENT_PALETTE[0]);
    expect(model.sections[1].accent).toBe(CATALOGUE_ACCENT_PALETTE[1]);
  });
});

describe('unit: buildCatalogueIndexModel (group page)', () => {
  it('creates a synthetic section for direct leaves plus one section per sub-group', () => {
    const model = buildCatalogueIndexModel(
      tree,
      macroB,
      'it',
      'Tutti i gruppi',
    );
    expect(model.sections[0].id).toBe('b'); // synthetic, current node id
    expect(model.sections[0].groups[0].items.map((i) => i.label)).toEqual([
      'Generale',
    ]);
    expect(model.sections[1].id).toBe('bg');
    expect(model.sections[1].label).toBe('Segnaletica');
    expect(model.sections[1].groups[0].items.map((i) => i.label)).toEqual([
      'Cartelli',
      'Guanti',
    ]);
  });

  it('uses rootLabel for a synthetic root section when tree has direct leaves', () => {
    const flat: MenuTreeNode[] = [
      node({ id: 'l', slug: 'solo', label: 'Solo', path: ['solo'] }),
    ];
    const model = buildCatalogueIndexModel(flat, null, 'it', 'Tutti i gruppi');
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].label).toBe('Tutti i gruppi');
    expect(model.sections[0].groups[0].items[0].href).toBe(
      '/it/categorie/solo',
    );
  });

  it('returns an empty model for an empty tree', () => {
    const model = buildCatalogueIndexModel([], null, 'it', 'Tutti i gruppi');
    expect(model.sections).toHaveLength(0);
    expect(model.totalGroups).toBe(0);
    expect(model.totalLeaves).toBe(0);
  });
});
