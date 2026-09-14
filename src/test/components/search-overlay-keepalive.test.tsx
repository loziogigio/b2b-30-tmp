import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The search overlay used to show a "recommended products" carousel fed by
 * the likes/trending service. It flickered: the heading and skeletons were
 * painted while the PIM lookup for the trending SKUs was in flight, then the
 * whole block unmounted when PIM returned no products. The section has been
 * removed outright, so the overlay must never mount that carousel again.
 *
 * The recent-search chips are still re-read from storage on every open so a
 * kept-alive overlay never shows a stale list.
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

describe('SearchOverlayB2B recommended products', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('never mounts the trending carousel, closed or open', () => {
    const { setOpen } = renderOverlay(false);
    expect(screen.queryByTestId('trending-carousel')).toBeNull();

    setOpen(true);
    expect(screen.queryByTestId('trending-carousel')).toBeNull();

    setOpen(false);
    setOpen(true);
    expect(screen.queryByTestId('trending-carousel')).toBeNull();
  });
});

describe('SearchOverlayB2B recent searches', () => {
  beforeEach(() => {
    localStorage.clear();
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
