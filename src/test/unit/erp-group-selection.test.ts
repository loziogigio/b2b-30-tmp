import { describe, it, expect } from 'vitest';
import {
  extractGroupCode,
  findNodeByGroupCode,
  toggleGroupCode,
} from '@/utils/erp-group-selection';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

function node(
  slug: string,
  path: string[],
  code: string | null,
  children: MenuTreeNode[] = [],
): MenuTreeNode {
  return {
    id: slug,
    slug,
    name: slug,
    label: slug,
    url: code ? `/search?filters-attribute_erp_groups_ss=${code}` : null,
    path,
    isGroup: true,
    children,
  };
}

// guanti (GUAN)
//   ├── maxiflex-active (MFA)
//   │     └── maxiflex-active-grip (MFAG)
//   └── maxiflex-b (MFB)
// scarpe (SCARPE)
const tree: MenuTreeNode[] = [
  node('guanti', ['guanti'], 'GUAN', [
    node('maxiflex-active', ['guanti', 'maxiflex-active'], 'MFA', [
      node(
        'maxiflex-active-grip',
        ['guanti', 'maxiflex-active', 'maxiflex-active-grip'],
        'MFAG',
      ),
    ]),
    node('maxiflex-b', ['guanti', 'maxiflex-b'], 'MFB'),
  ]),
  node('scarpe', ['scarpe'], 'SCARPE'),
];

describe('extractGroupCode', () => {
  it('extracts the group code from a node url', () => {
    expect(extractGroupCode(tree[0])).toBe('GUAN');
  });

  it('returns null for nodes without a url', () => {
    expect(extractGroupCode(node('x', ['x'], null))).toBeNull();
  });
});

describe('findNodeByGroupCode', () => {
  it('finds nested nodes by code', () => {
    expect(findNodeByGroupCode(tree, 'MFA')?.slug).toBe('maxiflex-active');
  });

  it('returns null for unknown codes', () => {
    expect(findNodeByGroupCode(tree, 'NOPE')).toBeNull();
  });
});

describe('toggleGroupCode', () => {
  it('selecting a child replaces its selected ancestor (drill-down)', () => {
    expect(toggleGroupCode(tree, ['GUAN'], 'MFA')).toEqual(['MFA']);
  });

  it('selecting a grandchild replaces its selected grandparent', () => {
    expect(toggleGroupCode(tree, ['GUAN'], 'MFAG')).toEqual(['MFAG']);
  });

  it('selecting an ancestor replaces its selected descendant (drill-up)', () => {
    expect(toggleGroupCode(tree, ['MFA'], 'GUAN')).toEqual(['GUAN']);
  });

  it('selecting a sibling keeps the existing selection (multi-select OR)', () => {
    expect(toggleGroupCode(tree, ['MFA'], 'MFB')).toEqual(['MFA', 'MFB']);
  });

  it('selecting an unrelated group keeps the existing selection', () => {
    expect(toggleGroupCode(tree, ['GUAN'], 'SCARPE')).toEqual([
      'GUAN',
      'SCARPE',
    ]);
  });

  it('only removes related codes, keeps unrelated ones', () => {
    expect(toggleGroupCode(tree, ['GUAN', 'SCARPE'], 'MFA')).toEqual([
      'SCARPE',
      'MFA',
    ]);
  });

  it('unselects an already-selected code', () => {
    expect(toggleGroupCode(tree, ['MFA', 'SCARPE'], 'MFA')).toEqual([
      'SCARPE',
    ]);
  });

  it('falls back to plain append when the clicked code is not in the tree', () => {
    expect(toggleGroupCode(tree, ['GUAN'], 'UNKNOWN')).toEqual([
      'GUAN',
      'UNKNOWN',
    ]);
  });

  it('keeps selected codes that are not in the tree when adding', () => {
    expect(toggleGroupCode(tree, ['LEGACY'], 'MFA')).toEqual(['LEGACY', 'MFA']);
  });

  it('selects from an empty selection', () => {
    expect(toggleGroupCode(tree, [], 'GUAN')).toEqual(['GUAN']);
  });
});
