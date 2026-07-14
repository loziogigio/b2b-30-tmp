import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  auth: { isAuthorized: true },
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: mocks.auth.isAuthorized, hidePrices: false }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: { cardStyle: { priceDecimals: 2 } } }),
}));
vi.mock('@contexts/likes/likes.context', () => ({
  useLikes: () => ({ isLiked: () => false, toggle: vi.fn() }),
}));
vi.mock('@/hooks/use-product-open', () => ({
  useProductOpen: () => vi.fn(),
}));
vi.mock('@components/product/add-to-cart', () => ({
  default: () => <div data-testid="add-to-cart" />,
}));
vi.mock('@components/product/b2b-offer-rows', () => ({
  buildCartPriceData: (a: any) => a,
  buildPromoPriceData: (a: any) => a,
}));
vi.mock('@utils/packaging', () => ({
  buildPackagingParts: () => ['1 PZ'],
}));
vi.mock('@components/themes/time/product/time-promo-gated-cta', () => ({
  TimeAlreadyPurchasedBadge: () => <div data-testid="purchased" />,
}));
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import TimeVariantsTable from '@/components/themes/time/product/time-variants-table';

const parent = { id: 'p1', sku: 'PARENT-1', name: 'Parent' };
const variants = [
  { id: 'v1', sku: 'SKU-A', model: 'M1' },
  { id: 'v2', sku: 'SKU-B', model: 'M2' },
];
const priceMap = {
  v1: {
    availability: 5,
    net_price: 10,
    gross_price: 10,
    packaging_option_default: { packaging_uom: 'PZ' },
  },
  v2: {
    availability: 3,
    net_price: 20,
    gross_price: 20,
    packaging_option_default: { packaging_uom: 'PZ' },
  },
} as any;

describe('TimeVariantsTable', () => {
  beforeEach(() => {
    mocks.auth.isAuthorized = true;
  });

  it('renders one row per variant with price and add-to-cart', async () => {
    render(
      <TimeVariantsTable
        lang="it"
        parent={parent}
        variants={variants}
        priceMap={priceMap}
        brand={{ name: 'ACME', brand_id: 'b1' }}
        fallbackImg="x.jpg"
      />,
    );
    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getByText('€10.00')).toBeInTheDocument();
    expect(screen.getByText('€20.00')).toBeInTheDocument();
    // AddToCart is loaded via next/dynamic({ ssr: false }), so it appears
    // after the dynamic import resolves — await it.
    expect((await screen.findAllByTestId('add-to-cart')).length).toBe(2);
  });

  it('omits the column header when showColumnHeader is false', () => {
    render(
      <TimeVariantsTable
        lang="it"
        parent={parent}
        variants={[variants[0]]}
        priceMap={priceMap}
        showColumnHeader={false}
      />,
    );
    expect(screen.queryByText('Modello')).toBeNull();
  });

  it('hides customer controls and availability for anonymous users', () => {
    mocks.auth.isAuthorized = false;

    render(
      <TimeVariantsTable
        lang="it"
        parent={parent}
        variants={[variants[0]]}
        priceMap={priceMap}
        fallbackImg="x.jpg"
      />,
    );

    expect(screen.queryByTitle('text-wishlist')).toBeNull();
    expect(screen.queryByText('Disponibilità')).toBeNull();
    expect(screen.queryByText('Disponibile')).toBeNull();
  });
});
