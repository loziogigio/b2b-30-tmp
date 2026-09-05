import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Reopening the search overlay felt slow because its trending carousel was
 * mounted only while `open` was true: every open re-fetched the trending SKUs
 * and re-initialised Swiper. The carousel now mounts on the first open and
 * stays mounted for the life of the overlay, and the recent-search chips are
 * re-read from storage on every open so a kept-alive overlay never shows a
 * stale list.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/it',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalState: () => ({ isOpen: false }),
}));
vi.mock('@components/product/feeds/trending-products-carousel', () => ({
  default: () => <div data-testid="trending-carousel" />,
}));
vi.mock('@components/product/products-carousel', () => ({
  default: () => null,
}));
vi.mock('@components/search/filters-b2b', () => ({
  SearchFiltersB2B: () => null,
}));
vi.mock('@components/ui/logo', () => ({
  default: () => null,
}));
vi.mock('@framework/product/get-pim-product', () => ({
  fetchPimProductList: vi.fn(async () => ({ items: [], total: 0 })),
}));

import SearchOverlayB2B from '@components/search/search-overlay-b2b';

function renderOverlay(open: boolean) {
  const client = new QueryClient();
  const ui = (isOpen: boolean) => (
    <QueryClientProvider client={client}>
      <SearchOverlayB2B lang="it" open={isOpen} onClose={() => {}} />
    </QueryClientProvider>
  );
  const utils = render(ui(open));
  return { ...utils, setOpen: (isOpen: boolean) => utils.rerender(ui(isOpen)) };
}

describe('SearchOverlayB2B keep-alive', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not mount the trending carousel before the first open', () => {
    renderOverlay(false);
    expect(screen.queryByTestId('trending-carousel')).toBeNull();
  });

  it('keeps the trending carousel mounted after the overlay closes', () => {
    const { setOpen } = renderOverlay(false);

    setOpen(true);
    expect(screen.getByTestId('trending-carousel')).toBeInTheDocument();

    setOpen(false);
    expect(screen.getByTestId('trending-carousel')).toBeInTheDocument();
  });

  it('re-reads the recent searches every time the overlay opens', () => {
    const { setOpen } = renderOverlay(false);

    localStorage.setItem('b2b-recent-searches', JSON.stringify(['viti']));
    setOpen(true);
    expect(screen.getByText('viti')).toBeInTheDocument();

    setOpen(false);
    localStorage.setItem(
      'b2b-recent-searches',
      JSON.stringify(['dadi', 'viti']),
    );
    setOpen(true);
    expect(screen.getByText('dadi')).toBeInTheDocument();
  });
});
