import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@/hooks/use-product-open', () => ({
  useProductOpen: () => vi.fn(),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: false, hidePrices: false }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: { cardStyle: { priceDecimals: 2 } } }),
}));
vi.mock('@framework/pricing', () => ({
  useProductsPriceMap: () => ({}),
  useProductPriceData: () => ({ net_price: 10, gross_price: 12 }),
}));
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));
// The spec-table is delegated to TimeVariantsTable — stub it so this test
// isolates the parent-row refactor (header + helpers + expand → table).
vi.mock('@/components/themes/time/product/time-variants-table', () => ({
  default: () => <div data-testid="variants-table-stub" />,
}));

import TimeProductRow from '@/components/themes/time/search/time-product-row';

const product = {
  id: 'p1',
  name: 'Parent Name',
  parent_sku: 'PARENT-1',
  brand: { name: 'ACME', brand_id: 'b1' },
  variations: [
    { id: 'v1', sku: 'SKU-A', model: 'M1' },
    { id: 'v2', sku: 'SKU-B', model: 'M2' },
  ],
} as any;

describe('TimeProductRow (after TimeVariantsTable extraction)', () => {
  it('renders the parent header with the formatted price and expands to the table', () => {
    render(<TimeProductRow lang="it" product={product} />);
    // Header renders the parent name + the fmtEuro-formatted parent price.
    expect(screen.getByText('Parent Name')).toBeInTheDocument();
    expect(screen.getByText('€10.00')).toBeInTheDocument();
    // Multi-variant parent starts collapsed; expanding mounts the shared table.
    expect(screen.queryByTestId('variants-table-stub')).toBeNull();
    fireEvent.click(screen.getByText('Mostra {{n}} varianti'));
    expect(screen.getByTestId('variants-table-stub')).toBeInTheDocument();
  });
});
