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
  isSavedListSource,
  isUnavailableListItem,
  parsePimFiltersFromUrlParams,
  withUnavailableItems,
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
    ).resolves.toEqual({
      skus: ['L1'],
      hasNext: true,
      totalCount: 3,
      products: {},
    });

    await expect(
      fetchSpecialSourceSkuPage({
        source: 'reminders',
        period: '7d',
        page: 1,
        pageSize: 50,
      }),
    ).resolves.toEqual({
      skus: ['R1'],
      hasNext: false,
      totalCount: 1,
      products: {},
    });

    await expect(
      fetchSpecialSourceSkuPage({
        source: 'trending',
        period: '30d',
        page: 1,
        pageSize: 50,
      }),
    ).resolves.toEqual({
      skus: ['T1'],
      hasNext: false,
      totalCount: 1,
      products: {},
    });

    expect(mockGetUserLikes).toHaveBeenCalledWith(2, 50, {
      includeProduct: false,
    });
    // The list shows the reminders still waiting, as the header badge counts.
    expect(mockGetUserReminders).toHaveBeenCalledWith(
      1,
      50,
      undefined,
      'active',
      { includeProduct: false },
    );
    expect(mockGetTrendingProductsPage).toHaveBeenCalledWith('30d', 1, 50);
  });

  it('carries each saved product snapshot when asked', async () => {
    mockGetUserLikes.mockResolvedValueOnce({
      likes: [
        { sku: 'GONE', product: { name: { it: 'Trapano' } } },
        { sku: 'LIVE' },
      ],
      has_next: false,
      total_count: 2,
    });
    mockGetUserReminders.mockResolvedValueOnce({
      reminders: [
        { sku: 'R-GONE', product: { image_url: 'https://cdn/x.jpg' } },
      ],
      has_next: false,
      total_count: 1,
    });

    const likes = await fetchSpecialSourceSkuPage({
      source: 'likes',
      period: '7d',
      page: 1,
      pageSize: 12,
      includeProduct: true,
    });
    const reminders = await fetchSpecialSourceSkuPage({
      source: 'reminders',
      period: '7d',
      page: 1,
      pageSize: 12,
      includeProduct: true,
    });

    expect(mockGetUserLikes).toHaveBeenCalledWith(1, 12, {
      includeProduct: true,
    });
    expect(mockGetUserReminders).toHaveBeenCalledWith(
      1,
      12,
      undefined,
      'active',
      { includeProduct: true },
    );
    expect(likes.products).toEqual({ GONE: { name: { it: 'Trapano' } } });
    expect(reminders.products).toEqual({
      'R-GONE': { image_url: 'https://cdn/x.jpg' },
    });
  });

  it('tells saved lists from trending', () => {
    expect(isSavedListSource('likes')).toBe(true);
    expect(isSavedListSource('reminders')).toBe(true);
    expect(isSavedListSource('trending')).toBe(false);
    expect(isSavedListSource(null)).toBe(false);
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

  describe('withUnavailableItems', () => {
    const snapshot = {
      name: { it: 'Trapano' },
      image_url: 'https://cdn/t.jpg',
    };

    it('keeps saved order and holds a placeholder for each SKU the search dropped', () => {
      const items = [{ sku: 'B' }, { sku: 'A' }];

      const result = withUnavailableItems(['A', 'GONE', 'B'], items, {
        GONE: snapshot,
      });

      expect(result).toEqual([
        { sku: 'A' },
        { unavailable: true, sku: 'GONE', product: snapshot },
        { sku: 'B' },
      ]);
      expect(result.map(isUnavailableListItem)).toEqual([false, true, false]);
    });

    it('matches SKUs whatever their case, and a placeholder may have no snapshot', () => {
      const result = withUnavailableItems(
        ['abc-1', 'DELETED'],
        [{ sku: 'ABC-1' }],
        {},
      );

      expect(result).toEqual([
        { sku: 'ABC-1' },
        { unavailable: true, sku: 'DELETED' },
      ]);
    });

    it('lists a product once and keeps results that match no saved SKU', () => {
      const result = withUnavailableItems(
        ['A', 'a'],
        [{ sku: 'A' }, { sku: 'EXTRA' }],
        {},
      );

      expect(result).toEqual([{ sku: 'A' }, { sku: 'EXTRA' }]);
    });
  });
});
