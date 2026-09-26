/**
 * A saved product the catalog no longer returns stays in its list, greyed out:
 * nothing to open or buy, only a button to remove it from the list.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  unlike: vi.fn(),
  removeReminder: vi.fn(),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@components/ui/image', () => ({
  default: ({ src, alt }: { src: unknown; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : 'placeholder'} alt={alt} />
  ),
}));
vi.mock('@contexts/likes/likes.context', () => ({
  useLikes: () => ({ unlike: mocks.unlike }),
}));
vi.mock('@contexts/reminders/reminders.context', () => ({
  useReminders: () => ({ remove: mocks.removeReminder }),
}));

import {
  UnavailableProductCard,
  UnavailableSavedProduct,
  snapshotName,
} from '@components/product/unavailable-product-card';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('snapshotName', () => {
  it('uses the language, then any language, then the SKU', () => {
    expect(
      snapshotName({ name: { it: 'Trapano', en: 'Drill' } }, 'en', 'S'),
    ).toBe('Drill');
    expect(snapshotName({ name: { it: 'Trapano' } }, 'en', 'S')).toBe(
      'Trapano',
    );
    expect(snapshotName({}, 'it', 'S')).toBe('S');
    expect(snapshotName(undefined, 'it', 'S')).toBe('S');
  });

  it('takes a plain-string name whole', () => {
    expect(snapshotName({ name: 'Trapano' }, 'it', 'S')).toBe('Trapano');
  });
});

describe('UnavailableProductCard', () => {
  function renderCard(onRemove = vi.fn()) {
    render(
      <UnavailableProductCard
        sku="GONE-1"
        product={{
          name: { it: 'Trapano' },
          image_url: 'https://cdn.test/t.jpg',
        }}
        lang="it"
        removeLabel="Rimuovi dai preferiti"
        removeIcon={<span>♥</span>}
        onRemove={onRemove}
      />,
    );
    return onRemove;
  }

  it('shows the product as no longer available, with nothing to open', () => {
    renderCard();

    expect(screen.getByText('GONE-1')).toBeInTheDocument();
    expect(screen.getByText('Trapano')).toBeInTheDocument();
    expect(screen.getByText('text-no-longer-available')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Trapano' })).toHaveAttribute(
      'src',
      'https://cdn.test/t.jpg',
    );
    expect(screen.queryByRole('link')).toBeNull();
    // Removing it is the only action left.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('names the product on the remove button', () => {
    renderCard();

    const button = screen.getByRole('button', {
      name: 'Rimuovi dai preferiti: Trapano',
    });
    expect(button).toHaveAccessibleDescription('text-no-longer-available');
  });

  it('leaves the list once removed', async () => {
    const onRemove = renderCard(vi.fn().mockResolvedValue(undefined));

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.queryByText('GONE-1')).toBeNull());
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('stays listed when the removal fails, ready for another try', async () => {
    renderCard(vi.fn().mockRejectedValue(new Error('offline')));

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    expect(screen.getByText('GONE-1')).toBeInTheDocument();
  });
});

describe('UnavailableSavedProduct', () => {
  function renderSaved(source: 'likes' | 'reminders') {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    render(
      <QueryClientProvider client={queryClient}>
        <UnavailableSavedProduct
          item={{
            unavailable: true,
            sku: 'GONE-1',
            product: { name: { it: 'Trapano' } },
          }}
          source={source}
          lang="it"
        />
      </QueryClientProvider>,
    );
    return invalidate;
  }

  it('removes a favorite through the server, then reloads the list', async () => {
    mocks.unlike.mockResolvedValue(undefined);
    const invalidate = renderSaved('likes');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'text-remove-from-wishlist: Trapano',
      }),
    );

    await waitFor(() => expect(screen.queryByText('GONE-1')).toBeNull());
    expect(mocks.unlike).toHaveBeenCalledWith('GONE-1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['search-special'] });
  });

  it('removes a reminder through the server', async () => {
    mocks.removeReminder.mockResolvedValue(undefined);
    renderSaved('reminders');

    fireEvent.click(
      screen.getByRole('button', { name: 'text-remove-reminder: Trapano' }),
    );

    await waitFor(() => expect(screen.queryByText('GONE-1')).toBeNull());
    expect(mocks.removeReminder).toHaveBeenCalledWith('GONE-1');
    expect(mocks.unlike).not.toHaveBeenCalled();
  });
});
