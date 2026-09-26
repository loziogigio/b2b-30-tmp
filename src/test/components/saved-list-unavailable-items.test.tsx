/**
 * The favorites and reminders pages keep a saved product the catalog no longer
 * returns, greyed out in its saved place, instead of dropping it silently.
 * Only for saved lists, and only when every saved SKU was actually searched.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  getUserLikes: vi.fn(),
  getTrendingProductsPage: vi.fn(),
  getUserReminders: vi.fn(),
  fetchPimProductList: vi.fn(),
  unlike: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/it/search',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/theme/registry', () => ({
  getThemedComponent: () => (props: { product: { sku: string } }) => (
    <div data-testid="product-card">{props.product.sku}</div>
  ),
}));
vi.mock('@components/product/product-rows/product-row-b2b', () => ({
  default: () => null,
}));
vi.mock('@components/ui/loaders/product-card-loader', () => ({
  default: () => <div data-testid="loader" />,
}));
vi.mock('@framework/product/get-pim-product', () => ({
  fetchPimProductList: mocks.fetchPimProductList,
  usePimProductListInfiniteQuery: () => ({
    data: undefined,
    error: null,
    isFetching: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    hasNextPage: false,
  }),
}));
vi.mock('@framework/likes', () => ({
  getUserLikes: mocks.getUserLikes,
  getTrendingProductsPage: mocks.getTrendingProductsPage,
}));
vi.mock('@framework/reminders', () => ({
  getUserReminders: mocks.getUserReminders,
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true }),
}));
vi.mock('@contexts/likes/likes.context', () => ({
  useLikes: () => ({ unlike: mocks.unlike }),
}));
vi.mock('@contexts/reminders/reminders.context', () => ({
  useReminders: () => ({ remove: vi.fn() }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@components/ui/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { ProductB2BSearch } from '@components/product/product-b2b-search';

const product = (sku: string) => ({ id: `id-${sku}`, sku, name: sku });

function openPage(query: string) {
  mocks.searchParams = new URLSearchParams(query);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProductB2BSearch lang="it" />
    </QueryClientProvider>,
  );
}

/** Product cards and greyed-out cards, in page order. */
function listedSkus() {
  return screen
    .getAllByText(/^(LIVE-\w+|GONE-\w+|T-\w+)$/)
    .map((node) => node.textContent);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  mocks.getUserLikes.mockResolvedValue({
    likes: [
      { sku: 'LIVE-A' },
      { sku: 'GONE-1', product: { name: { it: 'Trapano dismesso' } } },
      { sku: 'LIVE-B' },
    ],
    has_next: false,
    total_count: 3,
  });
  mocks.fetchPimProductList.mockResolvedValue({
    items: [product('LIVE-B'), product('LIVE-A')],
    total: 2,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('favorites page', () => {
  it('keeps a removed favorite in its saved place, greyed out', async () => {
    openPage('source=likes&page_size=12');

    const grey = await screen.findByText('Trapano dismesso');
    expect(
      within(grey.closest('article')!).getByText('text-no-longer-available'),
    ).toBeInTheDocument();
    expect(listedSkus()).toEqual(['LIVE-A', 'GONE-1', 'LIVE-B']);
    expect(mocks.getUserLikes).toHaveBeenCalledWith(1, 12, {
      includeProduct: true,
    });
  });

  it('adds no greyed-out card while a filter is on', async () => {
    openPage('source=likes&page_size=12&filters-brand_id=BOSCH');

    await screen.findByText('LIVE-A');
    expect(screen.queryByText('text-no-longer-available')).toBeNull();
    expect(mocks.getUserLikes).toHaveBeenCalledWith(1, 12, {
      includeProduct: false,
    });
  });

  it('adds no greyed-out card when the search page was cut off', async () => {
    mocks.fetchPimProductList.mockResolvedValue({
      items: [product('LIVE-A')],
      total: 2,
    });
    openPage('source=likes&page_size=12');

    await screen.findByText('LIVE-A');
    expect(screen.queryByText('text-no-longer-available')).toBeNull();
  });

  it('removes a greyed-out favorite and reloads the list', async () => {
    mocks.unlike.mockResolvedValue(undefined);
    openPage('source=likes&page_size=12');

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'text-remove-from-wishlist: Trapano dismesso',
      }),
    );

    await waitFor(() => expect(screen.queryByText('GONE-1')).toBeNull());
    expect(mocks.unlike).toHaveBeenCalledWith('GONE-1');
    await waitFor(() => expect(mocks.getUserLikes).toHaveBeenCalledTimes(2));
  });
});

describe('trending page', () => {
  it('never shows greyed-out cards: it is not a saved list', async () => {
    mocks.getTrendingProductsPage.mockResolvedValue({
      items: [{ sku: 'T-1' }, { sku: 'T-GONE' }],
      has_next: false,
      total_count: 2,
    });
    mocks.fetchPimProductList.mockResolvedValue({
      items: [product('T-1')],
      total: 1,
    });
    openPage('source=trending&page_size=12');

    await screen.findByText('T-1');
    expect(screen.queryByText('T-GONE')).toBeNull();
    expect(screen.queryByText('text-no-longer-available')).toBeNull();
  });
});
