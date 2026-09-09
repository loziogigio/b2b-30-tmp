/**
 * Likes mirror of reminders-bulk-coalescing: per-item status lookups from
 * detail/popup/list surfaces must coalesce into one /likes/status/bulk call
 * per render batch, and a cached answer must never revert a local toggle.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isAuthorized: true,
  liked: new Set<string>(),
  getBulkLikeStatus: vi.fn(),
  getUserLikes: vi.fn(),
  toggleLike: vi.fn(),
}));

vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: mocks.isAuthorized }),
}));
vi.mock('@utils/use-local-storage', () => ({
  useLocalStorage: () => [null, vi.fn()],
}));
vi.mock('@framework/likes', () => ({
  getBulkLikeStatus: mocks.getBulkLikeStatus,
  getUserLikes: mocks.getUserLikes,
  toggleLike: mocks.toggleLike,
  addLike: vi.fn(),
  removeLike: vi.fn(),
  clearAllUserLikes: vi.fn(),
}));

const { LikesProvider, useLikes } = await import(
  '@contexts/likes/likes.context'
);

let toggleRef: ((sku: string) => Promise<void>) | null = null;
function Row({ sku }: { sku: string }) {
  const likes = useLikes();
  toggleRef = likes.toggle;
  React.useEffect(() => {
    likes.loadBulkStatus([sku]).catch(() => {});
  }, [sku, likes.loadBulkStatus]);
  return <span data-testid={sku}>{likes.isLiked(sku) ? 'on' : 'off'}</span>;
}

const skus = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => `SKU-${from + i}`);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.liked = new Set(['SKU-1', 'SKU-11', 'SKU-21', 'SKU-31']);
  mocks.getBulkLikeStatus.mockReset();
  mocks.getBulkLikeStatus.mockImplementation(async (list: string[]) => ({
    like_statuses: list.map((sku) => ({
      sku,
      is_liked: mocks.liked.has(sku),
      total_likes: 1,
    })),
  }));
  mocks.getUserLikes.mockReset();
  mocks.getUserLikes.mockResolvedValue({
    likes: [],
    total_count: 0,
    page: 1,
    page_size: 100,
    has_next: false,
  });
  mocks.toggleLike.mockReset();
  mocks.toggleLike.mockImplementation(async (sku: string) => {
    const liked = !mocks.liked.has(sku);
    if (liked) mocks.liked.add(sku);
    else mocks.liked.delete(sku);
    return { sku, is_liked: liked, total_likes: liked ? 1 : 0 };
  });
});

describe('likes bulk status coalescing', () => {
  it('30 rows mounting together produce ONE bulk request with all 30 SKUs', async () => {
    render(
      <LikesProvider>
        {skus(30).map((s) => (
          <Row key={s} sku={s} />
        ))}
      </LikesProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkLikeStatus).toHaveBeenCalledTimes(1),
    );
    expect([...mocks.getBulkLikeStatus.mock.calls[0][0]].sort()).toEqual(
      [...skus(30)].sort(),
    );
    await waitFor(() =>
      expect(screen.getByTestId('SKU-1').textContent).toBe('on'),
    );
    expect(screen.getByTestId('SKU-2').textContent).toBe('off');
    await new Promise((r) => setTimeout(r, 100));
    expect(mocks.getBulkLikeStatus).toHaveBeenCalledTimes(1);
  });

  it('a toggled SKU keeps its new state when its row remounts (no stale cache)', async () => {
    const view = render(
      <LikesProvider>
        <Row sku="SKU-2" />
      </LikesProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkLikeStatus).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByTestId('SKU-2').textContent).toBe('off');
    await act(async () => {
      await toggleRef!('SKU-2');
    });
    expect(screen.getByTestId('SKU-2').textContent).toBe('on');
    // unmount + remount the row: it asks for status again
    view.rerender(<LikesProvider>{null}</LikesProvider>);
    view.rerender(
      <LikesProvider>
        <Row sku="SKU-2" />
      </LikesProvider>,
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByTestId('SKU-2').textContent).toBe('on');
  });
});
