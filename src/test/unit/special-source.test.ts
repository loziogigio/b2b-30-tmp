import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@framework/likes', () => ({
  getUserLikes: vi.fn(),
  getTrendingProductsPage: vi.fn(),
}));

vi.mock('@framework/reminders', () => ({
  getUserReminders: vi.fn(),
}));

import { getTrendingProductsPage, getUserLikes } from '@framework/likes';
import { getUserReminders } from '@framework/reminders';
import {
  buildSkuFilterParams,
  canLoadSpecialSource,
  fetchSpecialSourceSkuPage,
  fetchSpecialSourceSkus,
  getSpecialSource,
  parsePimFiltersFromUrlParams,
} from '@/components/search/special-source';

describe('special-source helpers', () => {
  const mockGetUserLikes = getUserLikes as ReturnType<typeof vi.fn>;
  const mockGetUserReminders = getUserReminders as ReturnType<typeof vi.fn>;
  const mockGetTrendingProductsPage = getTrendingProductsPage as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes supported source params and rejects unknown values', () => {
    expect(getSpecialSource('LIKES')).toBe('likes');
    expect(getSpecialSource('reminders')).toBe('reminders');
    expect(getSpecialSource('trending')).toBe('trending');
    expect(getSpecialSource('catalog')).toBeNull();
    expect(getSpecialSource(null)).toBeNull();
  });

  it('only allows anonymous special-source loading for trending', () => {
    expect(canLoadSpecialSource('trending', false)).toBe(true);
    expect(canLoadSpecialSource('likes', false)).toBe(false);
    expect(canLoadSpecialSource('reminders', true)).toBe(true);
    expect(canLoadSpecialSource(null, true)).toBe(false);
  });

  it('parses URL filters into PIM filters', () => {
    expect(
      parsePimFiltersFromUrlParams(
        {
          text: 'shoe',
          'filters-brand_id': 'BASE',
          'filters-sku': 'A;B',
        },
        { collectionSlug: 'summer' },
      ),
    ).toEqual({
      brand_id: 'BASE',
      sku: ['A', 'B'],
      collection_slugs: 'summer',
    });
  });

  it('builds facet SKU params only when SKUs exist', () => {
    expect(buildSkuFilterParams(['A', 'B'])).toEqual({
      'filters-sku': 'A;B',
    });
    expect(buildSkuFilterParams([])).toEqual({});
    expect(buildSkuFilterParams(undefined)).toEqual({});
  });

  it('fetches a normalized SKU page for every special source', async () => {
    mockGetUserLikes.mockResolvedValueOnce({
      likes: [{ sku: 'L1' }],
      has_next: true,
      total_count: 3,
    });
    mockGetUserReminders.mockResolvedValueOnce({
      reminders: [{ sku: 'R1' }],
      has_next: false,
      total_count: 1,
    });
    mockGetTrendingProductsPage.mockResolvedValueOnce({
      items: [{ sku: 'T1' }],
      has_next: false,
      total_count: 1,
    });

    await expect(
      fetchSpecialSourceSkuPage({
        source: 'likes',
        period: '7d',
        page: 2,
        pageSize: 50,
      }),
    ).resolves.toEqual({ skus: ['L1'], hasNext: true, totalCount: 3 });

    await expect(
      fetchSpecialSourceSkuPage({
        source: 'reminders',
        period: '7d',
        page: 1,
        pageSize: 50,
      }),
    ).resolves.toEqual({ skus: ['R1'], hasNext: false, totalCount: 1 });

    await expect(
      fetchSpecialSourceSkuPage({
        source: 'trending',
        period: '30d',
        page: 1,
        pageSize: 50,
      }),
    ).resolves.toEqual({ skus: ['T1'], hasNext: false, totalCount: 1 });

    expect(mockGetUserLikes).toHaveBeenCalledWith(2, 50);
    expect(mockGetUserReminders).toHaveBeenCalledWith(1, 50);
    expect(mockGetTrendingProductsPage).toHaveBeenCalledWith('30d', 1, 50);
  });

  it('fetches paged SKUs and removes duplicates', async () => {
    mockGetUserLikes
      .mockResolvedValueOnce({
        likes: [{ sku: 'A' }, { sku: 'B' }],
        has_next: true,
      })
      .mockResolvedValueOnce({
        likes: [{ sku: 'B' }, { sku: 'C' }],
        has_next: false,
      });

    await expect(
      fetchSpecialSourceSkus({
        source: 'likes',
        period: '7d',
        pageSize: 2,
      }),
    ).resolves.toEqual(['A', 'B', 'C']);
  });
});
