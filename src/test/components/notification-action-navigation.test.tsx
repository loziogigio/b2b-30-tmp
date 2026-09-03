import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationDetailModal } from '@/components/notifications/notification-detail-modal';

/**
 * A campaign's destination is free text from the Suite's campaign form. When it
 * is relative, `router.push` resolves it against the current page, so the same
 * notification opened from `/it/account/...` navigated to
 * `/it/account/search?...` — a 404 — instead of `/it/search?...`.
 */

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock('@framework/notifications', () => ({
  trackNotification: vi.fn(async () => undefined),
}));

const notification = (overrides: Record<string, unknown>) =>
  ({
    notification_id: 'n1',
    title: 'PROMO SUMMER',
    body: 'Scopri le promozioni estive',
    created_at: new Date().toISOString(),
    is_read: false,
    ...overrides,
  }) as any;

function openModal(item: any) {
  const onNavigate = vi.fn();
  render(
    <NotificationDetailModal
      notification={item}
      isOpen
      onClose={() => {}}
      onNavigate={onNavigate}
      onDelete={() => {}}
      lang="it"
    />,
  );
  return onNavigate;
}

describe('notification action navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('localizes a relative action_url instead of resolving it against the current page', () => {
    const onNavigate = openModal(
      notification({
        action_url: 'search?filters-promo_code=26-SUMMER',
        payload: { category: 'product' },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Vai ai Prodotti|.+/ }));

    expect(onNavigate).toHaveBeenCalledWith(
      '/it/search?filters-promo_code=26-SUMMER',
    );
  });

  it('leaves an absolute action_url untouched', () => {
    const onNavigate = openModal(
      notification({
        action_url: 'https://b2b.example.com/it/search?filters-promo_code=26',
        payload: { category: 'product' },
      }),
    );
    const openSpy = vi
      .spyOn(window, 'open')
      .mockImplementation(() => null as any);

    fireEvent.click(screen.getByRole('button', { name: /.+/ }));

    // Cross-origin destinations open in a new tab rather than in-app.
    expect(openSpy).toHaveBeenCalledWith(
      'https://b2b.example.com/it/search?filters-promo_code=26',
      '_blank',
      'noopener,noreferrer',
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('localizes a generic payload url', () => {
    const onNavigate = openModal(
      notification({
        payload: {
          category: 'generic',
          url: 'cataloghi',
          open_in_new_tab: false,
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /.+/ }));

    expect(onNavigate).toHaveBeenCalledWith('/it/cataloghi');
  });

  it('still localizes products_url exactly once', () => {
    const onNavigate = openModal(
      notification({
        payload: {
          category: 'product',
          products_url: '/search?text=guanti',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /.+/ }));

    expect(onNavigate).toHaveBeenCalledWith('/it/search?text=guanti');
  });
});
