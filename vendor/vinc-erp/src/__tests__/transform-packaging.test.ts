import { describe, it, expect } from 'vitest';
import { getPackagingOptions } from '../mymb/transform.js';

describe('getPackagingOptions', () => {
  const list = [
    { IdImballo: 1, CodiceImballo1: 'PZ', QtaXImballo: 1 },
    { IdImballo: 2, CodiceImballo1: 'BOX', QtaXImballo: 6 },
    { IdImballo: 3, CodiceImballo1: 'PAL', QtaXImballo: 48 },
  ];

  it('keeps only configured IDs, in configured order, with id/label/amount', () => {
    const out = getPackagingOptions(list, [3, 1]);
    expect(out.map((o) => o.IdImballo)).toEqual([3, 1]);
    expect(out[0]).toMatchObject({ id: 3, label: 'PAL', amount: 48 });
    expect(out[1]).toMatchObject({ id: 1, label: 'PZ', amount: 1 });
  });

  it('returns [] when no configured IDs match', () => {
    expect(getPackagingOptions(list, [99])).toEqual([]);
  });

  it('returns [] for empty/missing inputs', () => {
    expect(getPackagingOptions([], [1])).toEqual([]);
    expect(getPackagingOptions(undefined, [1])).toEqual([]);
  });
});
