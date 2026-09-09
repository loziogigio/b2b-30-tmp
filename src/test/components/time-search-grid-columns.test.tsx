import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * On phones the time-theme grid showed ONE product per row, so a search
 * result took a full screen height per item. Two per row is the mobile
 * baseline; the wider breakpoints are unchanged.
 */

// jsdom has no IntersectionObserver; the infinite-scroll sentinel wants one.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/it/search',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
    data: undefined,
    error: null,
    isFetching: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    hasNextPage: false,
  }),
}));
vi.mock('@framework/product/get-pim-product', () => ({
  usePimProductListInfiniteQuery: () => ({
    data: {
      pages: [
        {
          total: 2,
          items: [
            { id: 'P1', sku: 'P1', variations: [] },
            { id: 'P2', sku: 'P2', variations: [] },
          ],
        },
      ],
    },
    error: null,
    isFetching: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    hasNextPage: false,
  }),
  fetchPimProductList: vi.fn(),
}));
vi.mock('@components/themes/time/product/time-product-card', () => ({
  default: ({ product }: any) => (
    <div data-testid="product-card">{product.sku}</div>
  ),
}));
vi.mock('@components/themes/time/search/time-product-row', () => ({
  default: ({ product }: any) => (
    <div data-testid="product-row">{product.sku}</div>
  ),
}));
vi.mock('@framework/pricing', () => ({
  useProductsPriceMap: () => ({}),
}));
vi.mock('@/hooks/use-catalog-settings', () => ({
  useCatalogSettings: () => ({ settings: { defaultView: 'grid' } }),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true }),
}));

import { TimeProductSearch } from '@components/themes/time/search/time-product-search';

function gridClasses(sidebarOpen: boolean) {
  const { container, unmount } = render(
    <TimeProductSearch lang="it" sidebarOpen={sidebarOpen} />,
  );
  const grid = screen.getAllByTestId('product-card')[0].parentElement!;
  const className = grid.className;
  unmount();
  void container;
  return className;
}

describe('time theme product grid columns', () => {
  it.each([true, false])(
    'shows two products per row on mobile (sidebar open: %s)',
    (sidebarOpen) => {
      const cls = gridClasses(sidebarOpen);
      expect(cls).toContain('grid-cols-2');
      expect(cls).not.toContain('grid-cols-1');
    },
  );

  it('keeps the wider breakpoints as they were', () => {
    expect(gridClasses(true)).toContain('lg:grid-cols-3');
    expect(gridClasses(true)).toContain('2xl:grid-cols-4');
    expect(gridClasses(false)).toContain('xl:grid-cols-4');
  });

  it('uses a tighter gutter on mobile so two cards fit a narrow screen', () => {
    const cls = gridClasses(true);
    expect(cls).toContain('gap-2');
    expect(cls).toContain('md:gap-4');
  });
});
