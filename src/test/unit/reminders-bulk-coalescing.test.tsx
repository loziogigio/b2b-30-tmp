/**
 * The search list (product-row-b2b) asks the reminders context for each row's
 * status on mount. With N rows that used to be N calls to /status/bulk, each
 * carrying one SKU (hidros, 2026-09-09: 147 requests for 106 rows). The
 * provider must coalesce those into one request per render batch.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isAuthorized: true,
  getBulkReminderStatus: vi.fn(),
  getUserReminders: vi.fn(),
  toggleReminder: vi.fn(),
  active: new Set<string>(),
}));

vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: mocks.isAuthorized }),
}));
vi.mock('@utils/use-local-storage', () => ({
  useLocalStorage: () => [null, vi.fn()],
}));
vi.mock('@framework/reminders', () => ({
  getBulkReminderStatus: mocks.getBulkReminderStatus,
  getUserReminders: mocks.getUserReminders,
  toggleReminder: mocks.toggleReminder,
  clearAllUserReminders: vi.fn(),
}));

const { RemindersProvider, useReminders } = await import(
  '@contexts/reminders/reminders.context'
);

let toggleRef: ((sku: string) => Promise<void>) | null = null;
function Row({ sku }: { sku: string }) {
  const reminders = useReminders();
  toggleRef = reminders.toggle;
  React.useEffect(() => {
    reminders.loadBulkStatus([sku]).catch(() => {});
  }, [sku, reminders.loadBulkStatus]);
  return (
    <span data-testid={sku}>{reminders.hasReminder(sku) ? 'on' : 'off'}</span>
  );
}

const skus = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => `SKU-${from + i}`);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.active = new Set(['SKU-1', 'SKU-11', 'SKU-21', 'SKU-31']);
  mocks.getBulkReminderStatus.mockReset();
  mocks.getBulkReminderStatus.mockImplementation(async (list: string[]) => ({
    user_id: 'u1',
    reminder_statuses: list.map((sku) => ({
      sku,
      has_active_reminder: mocks.active.has(sku),
    })),
  }));
  mocks.toggleReminder.mockReset();
  mocks.toggleReminder.mockImplementation(async (sku: string) => {
    const active = !mocks.active.has(sku);
    if (active) mocks.active.add(sku);
    else mocks.active.delete(sku);
    return {
      sku,
      user_id: 'u1',
      action: active ? 'created' : 'cancelled',
      has_active_reminder: active,
    };
  });
  mocks.getUserReminders.mockReset();
  mocks.getUserReminders.mockResolvedValue({
    reminders: [],
    total_count: 0,
    page: 1,
    page_size: 100,
    has_next: false,
  });
});

describe('reminders bulk status coalescing', () => {
  it('30 rows mounting together produce ONE bulk request with all 30 SKUs', async () => {
    render(
      <RemindersProvider>
        {skus(30).map((s) => (
          <Row key={s} sku={s} />
        ))}
      </RemindersProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkReminderStatus).toHaveBeenCalledTimes(1),
    );
    expect([...mocks.getBulkReminderStatus.mock.calls[0][0]].sort()).toEqual(
      [...skus(30)].sort(),
    );
    await waitFor(() =>
      expect(screen.getByTestId('SKU-1').textContent).toBe('on'),
    );
    expect(screen.getByTestId('SKU-2').textContent).toBe('off');
    // The state update caused by the response must not re-trigger requests.
    await new Promise((r) => setTimeout(r, 100));
    expect(mocks.getBulkReminderStatus).toHaveBeenCalledTimes(1);
  });

  it('rows mounted later only request the SKUs not already checked', async () => {
    const view = render(
      <RemindersProvider>
        {skus(30).map((s) => (
          <Row key={s} sku={s} />
        ))}
      </RemindersProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkReminderStatus).toHaveBeenCalledTimes(1),
    );
    view.rerender(
      <RemindersProvider>
        {skus(40).map((s) => (
          <Row key={s} sku={s} />
        ))}
      </RemindersProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkReminderStatus).toHaveBeenCalledTimes(2),
    );
    expect([...mocks.getBulkReminderStatus.mock.calls[1][0]].sort()).toEqual(
      [...skus(10, 30)].sort(),
    );
  });

  it('never calls the API for a logged-out visitor', async () => {
    mocks.isAuthorized = false;
    try {
      render(
        <RemindersProvider>
          {skus(5).map((s) => (
            <Row key={s} sku={s} />
          ))}
        </RemindersProvider>,
      );
      await new Promise((r) => setTimeout(r, 60));
      expect(mocks.getBulkReminderStatus).not.toHaveBeenCalled();
    } finally {
      mocks.isAuthorized = true;
    }
  });
  it('a toggled SKU keeps its new state when its row remounts (no stale cache)', async () => {
    const view = render(
      <RemindersProvider>
        <Row sku="SKU-2" />
      </RemindersProvider>,
    );
    await waitFor(() =>
      expect(mocks.getBulkReminderStatus).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByTestId('SKU-2').textContent).toBe('off');
    await act(async () => {
      await toggleRef!('SKU-2');
    });
    expect(screen.getByTestId('SKU-2').textContent).toBe('on');
    view.rerender(<RemindersProvider>{null}</RemindersProvider>);
    view.rerender(
      <RemindersProvider>
        <Row sku="SKU-2" />
      </RemindersProvider>,
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByTestId('SKU-2').textContent).toBe('on');
  });
});
