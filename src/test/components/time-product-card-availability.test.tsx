import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  auth: { isAuthorized: false },
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: mocks.auth.isAuthorized, hidePrices: false }),
}));
vi.mock('@/hooks/use-product-open', () => ({
  useProductOpen: () => vi.fn(),
}));
vi.mock('@/hooks/use-catalog-settings', () => ({
  useCatalogSettings: () => ({
    settings: { availabilityDisplay: 'in_out' },
  }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: { cardStyle: { priceDecimals: 2 } } }),
}));
vi.mock('@framework/pricing', () => ({
  useProductPriceData: (_product: unknown, options?: { override?: unknown }) =>
    options?.override,
}));
vi.mock('@utils/packaging', () => ({ buildPackagingParts: () => [] }));
vi.mock('@contexts/likes/likes.context', () => ({
  useLikes: () => ({ isLiked: () => false, toggle: vi.fn() }),
}));
vi.mock('@contexts/reminders/reminders.context', () => ({
  useReminders: () => ({ hasReminder: () => false, toggle: vi.fn() }),
}));
vi.mock('@components/product/add-to-cart', () => ({
  default: () => <div data-testid="add-to-cart" />,
}));
vi.mock('@components/themes/time/product/time-promo-gated-cta', () => ({
  hasActivePromo: () => false,
  PromoGatedCta: () => null,
  TimeAlreadyPurchasedBadge: () => null,
  TimePromoLabel: () => null,
  usePromoGating: () => ({
    hasMultiplePromos: false,
    isPromoGated: false,
    canInlineAdd: false,
    cartQty: 0,
  }),
}));
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));
vi.mock('@components/ui/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import TimeProductCard from '@/components/themes/time/product/time-product-card';

const product = {
  id: 'ART1',
  sku: 'ART1',
  name: 'Test product',
  image: { thumbnail: '/test.png' },
  variations: [],
} as any;

describe('TimeProductCard availability', () => {
  beforeEach(() => {
    mocks.auth.isAuthorized = false;
  });

  it('does not render ERP availability for an anonymous visitor', () => {
    render(
      <TimeProductCard
        lang="it"
        product={product}
        priceData={
          {
            availability: 0,
            product_label_action: { LABEL: 'Esaurito' },
          } as any
        }
      />,
    );

    expect(screen.queryByText('Esaurito')).toBeNull();
  });

  it('does not interpret an empty loading placeholder as out of stock', () => {
    mocks.auth.isAuthorized = true;
    render(
      <TimeProductCard lang="it" product={product} priceData={{} as any} />,
    );

    expect(screen.queryByText('Non disponibile')).toBeNull();
  });

  it('renders real availability for an authenticated customer', () => {
    mocks.auth.isAuthorized = true;
    render(
      <TimeProductCard
        lang="it"
        product={product}
        priceData={
          {
            availability: 0,
            product_label_action: { LABEL: 'Esaurito' },
          } as any
        }
      />,
    );

    expect(screen.getByText('Esaurito')).toBeInTheDocument();
  });
});
