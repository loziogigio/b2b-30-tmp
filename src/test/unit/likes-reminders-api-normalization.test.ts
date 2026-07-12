import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@framework/utils/httpPIM', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

import { del, get, post } from '@framework/utils/httpPIM';
import {
  getBulkLikeStatus,
  getTrendingProductsPage,
  getUserLikes,
  removeLike,
} from '@framework/likes';
import { getBulkReminderStatus, getUserReminders } from '@framework/reminders';

const mockedGet = vi.mocked(get);
const mockedPost = vi.mocked(post);
const mockedDel = vi.mocked(del);

describe('likes/reminders API normalization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('normalizes commerce-suite bulk like status arrays', async () => {
    mockedPost.mockResolvedValueOnce({
      success: true,
      data: [{ sku: 'SKU-1', is_liked: true, total_likes: 3 }],
    });

    const result = await getBulkLikeStatus(['SKU-1']);

    expect(mockedPost).toHaveBeenCalledWith('api/b2b/likes/status/bulk', {
      skus: ['SKU-1'],
    });
    expect(result.like_statuses).toEqual([
      { sku: 'SKU-1', is_liked: true, total_likes: 3 },
    ]);
  });

  it('removes likes with a proxy-safe sku query param', async () => {
    mockedDel.mockResolvedValueOnce({ success: true });

    await removeLike('SKU-1');

    expect(mockedDel).toHaveBeenCalledWith('api/b2b/likes?sku=SKU-1');
  });

  it('normalizes user likes without an is_active flag', async () => {
    mockedGet.mockResolvedValueOnce({
      success: true,
      data: {
        likes: [
          {
            sku: 'SKU-1',
            is_liked: true,
            liked_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        total_count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      },
    });

    const result = await getUserLikes(1, 20);

    expect(result.likes[0]).toMatchObject({
      sku: 'SKU-1',
      is_active: true,
    });
  });

  it('maps commerce-suite trending products to B2B items', async () => {
    mockedGet.mockResolvedValueOnce({
      success: true,
      data: {
        products: [{ sku: 'SKU-2', recent_likes: 2, velocity_score: 0.286 }],
        total_count: 1,
        page: 1,
        page_size: 12,
        has_next: false,
        period: '7d',
      },
    });

    const result = await getTrendingProductsPage('7d', 1, 12);

    expect(result.items).toEqual([
      { sku: 'SKU-2', recent_likes: 2, velocity_score: 0.286 },
    ]);
    expect(result.total_count).toBe(1);
  });

  it('normalizes commerce-suite bulk reminder status dates', async () => {
    mockedPost.mockResolvedValueOnce({
      success: true,
      data: [
        {
          sku: 'REM-1',
          has_active_reminder: true,
          status: 'active',
          created_at: '2026-01-01T00:00:00.000Z',
          expires_at: '2026-02-01T00:00:00.000Z',
        },
      ],
    });

    const result = await getBulkReminderStatus(['REM-1']);

    expect(result[0]).toMatchObject({
      sku: 'REM-1',
      has_active_reminder: true,
      reminder_created_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      expires_at: '2026-02-01T00:00:00.000Z',
    });
  });

  it('normalizes active user reminders without an is_active flag', async () => {
    mockedGet.mockResolvedValueOnce({
      success: true,
      data: {
        reminders: [
          {
            sku: 'REM-1',
            user_id: 'user-1',
            status: 'active',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        total_count: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      },
    });

    const result = await getUserReminders(1, 20);

    expect(result.reminders[0]).toMatchObject({
      sku: 'REM-1',
      status: 'active',
      is_active: true,
    });
  });
});
