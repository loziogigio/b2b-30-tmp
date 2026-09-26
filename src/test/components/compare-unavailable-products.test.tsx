/**
 * A compared product the catalog no longer returns stays on the compare page,
 * greyed out, with its name and photo as last shown: out of the table (a
 * column of dashes would flag every row as different), in its own strip.
 */
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  skus: [] as string[],
  removeSku: vi.fn(),
  query: {} as { data?: unknown; isLoading: boolean; error: Error | null },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/compare/compare.context', () => ({
  useCompareList: () => ({
    skus: mocks.skus,
    addSku: vi.fn(),
    removeSku: mocks.removeSku,
    clear: vi.fn(),
  }),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true, hidePrices: false }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: {} }),
}));
vi.mock('@framework/pricing', () => ({
  useProductsPriceMap: () => ({}),
}));
vi.mock('@framework/product/get-pim-product', () => ({
  usePimProductListQuery: () => mocks.query,
}));
vi.mock('@utils/export-comparison', () => ({
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@components/ui/container', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@components/product/ProductComparisonTable', () => ({
  ProductComparisonTable: ({ products }: { products: { sku: string }[] }) => (
    <div data-testid="comparison-table">
      {products.map((p) => p.sku).join(',')}
    </div>
  ),
}));
vi.mock('@components/ui/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import ProductCompareClient from '@components/product/ProductCompareClient';

const product = (sku: string) => ({
  id: `id-${sku}`,
  sku,
  name: `Name ${sku}`,
  features: [],
});

function searchReturns(skus: string[]) {
  mocks.query = { data: skus.map(product), isLoading: false, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.skus = ['LIVE-1', 'GONE-1'];
});

describe('compare page', () => {
  it('keeps a removed product out of the table, greyed out in its own strip', () => {
    localStorage.setItem(
      'vinc-compare-products',
      JSON.stringify({ 'GONE-1': { name: { it: 'Levigatrice' } } }),
    );
    searchReturns(['LIVE-1']);

    render(<ProductCompareClient lang="it" />);

    expect(screen.getByTestId('comparison-table')).toHaveTextContent('LIVE-1');
    expect(screen.getByTestId('comparison-table')).not.toHaveTextContent(
      'GONE-1',
    );
    const strip = screen
      .getByText('text-products-no-longer-available')
      .closest('section')!;
    expect(within(strip).getByText('Levigatrice')).toBeInTheDocument();
    expect(
      within(strip).getByText('text-no-longer-available'),
    ).toBeInTheDocument();
  });

  it('marks the removed product in the list of compared codes', () => {
    searchReturns(['LIVE-1']);

    render(<ProductCompareClient lang="it" />);

    const chip = screen.getByText('GONE-1', { selector: 'button' });
    expect(chip).toHaveClass('line-through');
    expect(within(chip).getByText('text-no-longer-available')).toHaveClass(
      'sr-only',
    );
    expect(screen.getByText('LIVE-1', { selector: 'button' })).not.toHaveClass(
      'line-through',
    );
  });

  it('removes the greyed-out product from the comparison', () => {
    searchReturns(['LIVE-1']);

    render(<ProductCompareClient lang="it" />);
    fireEvent.click(
      screen.getByRole('button', { name: 'text-remove-from-compare: GONE-1' }),
    );

    expect(mocks.removeSku).toHaveBeenCalledWith('GONE-1');
  });

  it('shows the strip, not the empty state, when every product was removed', () => {
    searchReturns([]);

    render(<ProductCompareClient lang="it" />);

    expect(screen.queryByText('text-no-products-selected')).toBeNull();
    expect(screen.queryByTestId('comparison-table')).toBeNull();
    expect(
      screen.getByText('text-products-no-longer-available'),
    ).toBeInTheDocument();
  });

  it('flags nothing while loading or after a failed search', () => {
    mocks.query = { data: undefined, isLoading: true, error: null };
    const { unmount } = render(<ProductCompareClient lang="it" />);
    expect(screen.queryByText('text-products-no-longer-available')).toBeNull();
    unmount();

    mocks.query = {
      data: undefined,
      isLoading: false,
      error: new Error('down'),
    };
    render(<ProductCompareClient lang="it" />);
    expect(screen.queryByText('text-products-no-longer-available')).toBeNull();
    expect(screen.getByText('GONE-1', { selector: 'button' })).not.toHaveClass(
      'line-through',
    );
  });
});
