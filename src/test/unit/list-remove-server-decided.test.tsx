/**
 * Removing a saved item asks the server, not the local index: the index only
 * holds the items loaded so far, and a toggle would re-create an item already
 * removed elsewhere. A 404 ("nothing active") means it is already gone.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  removeLike: vi.fn(),
  toggleLike: vi.fn(),
  getUserLikes: vi.fn(),
  removeReminder: vi.fn(),
  toggleReminder: vi.fn(),
  getUserReminders: vi.fn(),
}));

vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true }),
}));
vi.mock('@utils/use-local-storage', () => ({
  useLocalStorage: () => [null, vi.fn()],
}));
vi.mock('@framework/likes', () => ({
  addLike: vi.fn(),
  removeLike: mocks.removeLike,
  toggleLike: mocks.toggleLike,
  getBulkLikeStatus: vi.fn(async () => ({ like_statuses: [] })),
  getUserLikes: mocks.getUserLikes,
  clearAllUserLikes: vi.fn(),
}));
vi.mock('@framework/reminders', () => ({
  toggleReminder: mocks.toggleReminder,
  removeReminder: mocks.removeReminder,
  getBulkReminderStatus: vi.fn(async () => []),
  getUserReminders: mocks.getUserReminders,
  clearAllUserReminders: vi.fn(),
}));

const { LikesProvider, useLikes } = await import(
  '@contexts/likes/likes.context'
);
const { RemindersProvider, useReminders } = await import(
  '@contexts/reminders/reminders.context'
);

let likes: ReturnType<typeof useLikes>;
let reminders: ReturnType<typeof useReminders>;

function Probe() {
  likes = useLikes();
  reminders = useReminders();
  return null;
}

async function renderLists() {
  render(
    <LikesProvider>
      <RemindersProvider>
        <Probe />
      </RemindersProvider>
    </LikesProvider>,
  );
  // The badge counts the loaded items; the removed SKUs are not among them.
  await waitFor(() => {
    expect(likes.summary?.totalCount).toBe(3);
    expect(reminders.summary?.totalCount).toBe(2);
  });
}

const notFound = Object.assign(new Error('Not found'), {
  response: { status: 404 },
});
const serverError = Object.assign(new Error('Boom'), {
  response: { status: 500 },
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.clearAllMocks();
  mocks.getUserLikes.mockResolvedValue({
    likes: [{ sku: 'A' }, { sku: 'B' }, { sku: 'C' }],
    total_count: 3,
    page: 1,
    page_size: 100,
    has_next: false,
  });
  mocks.getUserReminders.mockResolvedValue({
    reminders: [
      { sku: 'R1', status: 'active', is_active: true },
      { sku: 'R2', status: 'active', is_active: true },
    ],
    total_count: 2,
    page: 1,
    page_size: 50,
    has_next: false,
  });
});

describe('likes.unlike', () => {
  it('deletes a like the local index has not loaded, and counts it', async () => {
    mocks.removeLike.mockResolvedValue({ success: true });
    await renderLists();

    await act(() => likes.unlike('OLD-SKU'));

    expect(mocks.removeLike).toHaveBeenCalledWith('OLD-SKU');
    expect(mocks.toggleLike).not.toHaveBeenCalled();
    expect(likes.summary?.totalCount).toBe(2);
  });

  it('takes a like already gone as removed, without touching the count', async () => {
    mocks.removeLike.mockRejectedValue(notFound);
    await renderLists();

    await act(() => likes.unlike('GONE-SKU'));

    expect(likes.summary?.totalCount).toBe(3);
  });

  it('lets any other failure reach the caller', async () => {
    mocks.removeLike.mockRejectedValue(serverError);
    await renderLists();

    await expect(likes.unlike('SKU-1')).rejects.toBe(serverError);
    expect(likes.summary?.totalCount).toBe(3);
  });
});

describe('reminders.remove', () => {
  it('deletes the reminder instead of toggling it, and counts it', async () => {
    mocks.removeReminder.mockResolvedValue({ success: true });
    await renderLists();

    await act(() => reminders.remove('OLD-SKU'));

    expect(mocks.removeReminder).toHaveBeenCalledWith('OLD-SKU');
    expect(mocks.toggleReminder).not.toHaveBeenCalled();
    expect(reminders.summary?.totalCount).toBe(1);
  });

  it('takes a reminder already gone as removed, without touching the count', async () => {
    mocks.removeReminder.mockRejectedValue(notFound);
    await renderLists();

    await act(() => reminders.remove('GONE-SKU'));

    expect(reminders.summary?.totalCount).toBe(2);
  });
});
