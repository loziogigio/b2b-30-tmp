import { describe, expect, it } from 'vitest';
import {
  expandCategoryFilterToLeaves,
  type CategoryMap,
} from '@/lib/pim/category-filter';

const categories: CategoryMap = {
  root: { id: 'root', level: 1, path: [] },
  branch: { id: 'branch', level: 2, parent_id: 'root', path: ['root'] },
  leafA: {
    id: 'leafA',
    level: 3,
    parent_id: 'branch',
    path: ['root', 'branch'],
  },
  leafB: {
    id: 'leafB',
    level: 3,
    parent_id: 'branch',
    path: ['root', 'branch'],
  },
};

describe('expandCategoryFilterToLeaves', () => {
  it('drops a selected ancestor and keeps the selected descendant leaves', () => {
    expect(
      expandCategoryFilterToLeaves(['root', 'branch'], categories),
    ).toEqual(['leafA', 'leafB']);
  });

  it('deduplicates ids and preserves unknown ids', () => {
    expect(
      expandCategoryFilterToLeaves(['leafA', 'leafA', 'unknown'], categories),
    ).toEqual(['leafA', 'unknown']);
  });

  it('terminates on malformed cyclic category data and keeps the selection', () => {
    // A parent cycle has no leaves to expand to. The walk must end, and the
    // result must not be [] (which the backend reads as "every category").
    const cyclic: CategoryMap = {
      a: { id: 'a', level: 1, parent_id: 'b' },
      b: { id: 'b', level: 2, parent_id: 'a' },
    };
    expect(expandCategoryFilterToLeaves('a', cyclic)).toEqual(['a']);
  });

  it('reads category metadata linearly for a large unknown selection', () => {
    let reads = 0;
    const emptyMap = new Proxy({} as CategoryMap, {
      get(target, property, receiver) {
        reads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const ids = Array.from({ length: 1_000 }, (_, index) => `unknown-${index}`);

    expect(expandCategoryFilterToLeaves(ids, emptyMap)).toHaveLength(
      ids.length,
    );
    expect(reads).toBeLessThan(ids.length * 3);
  });
  it('keeps the original selection when malformed cyclic data shadows every id', () => {
    // Two categories that list each other as ancestors shadow one another, so
    // the expansion has nothing to walk. Returning [] would be read by the
    // search backend as "no category restriction" — the whole catalogue.
    const cyclic: CategoryMap = {
      a: { id: 'a', level: 2, parent_id: 'b', path: ['b'] },
      b: { id: 'b', level: 2, parent_id: 'a', path: ['a'] },
    };
    expect(expandCategoryFilterToLeaves(['a', 'b'], cyclic)).toEqual([
      'a',
      'b',
    ]);
  });

  it('still returns an empty filter for an empty selection', () => {
    expect(expandCategoryFilterToLeaves([], categories)).toEqual([]);
  });
});
