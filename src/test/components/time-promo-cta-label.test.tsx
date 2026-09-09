import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The offers CTA must read the same on every time listing surface, with the
 * catalog list row as the reference wording: "VEDI OFFERTE". BF00811 exposed
 * the drift — the list said VEDI OFFERTE while the grid card said
 * "visualizza prodotto" for the very same article.
 */
const mocks = vi.hoisted(() => ({
  auth: { isAuthorized: true },
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
  useCatalogSettings: () => ({ settings: { availabilityDisplay: 'in_out' } }),
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
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));
vi.mock('@components/ui/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));
// The promo module itself is the code under test — only its two context
// dependencies are stubbed.
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({ items: [] }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalAction: () => ({ openModal: vi.fn(), closeModal: vi.fn() }),
}));

import TimeProductCard from '@/components/themes/time/product/time-product-card';

const product = {
  id: '52282',
  sku: 'BF00811',
  name: 'BACINELLA - QUAD. - 10 LT - GRIGIO',
  image: { thumbnail: '/test.png' },
  variations: [],
} as any;

/** BF00811 as the ERP actually returns it: two promos, count_promo 0. */
const bf00811 = {
  entity_code: '52282',
  availability: 0,
  net_price: 1.43,
  gross_price: 1.43,
  price_discount: 1.2,
  promo: true,
  is_promo: true,
  is_improving_promo: true,
  count_promo: 0,
  num_promo: 2,
  discount: [],
  discount_extra: [],
  discount_description: '',
  packaging_option_default: { packaging_uom: 'Nr', qty_x_packaging: 12 },
  product_label_action: { LABEL: 'Non disponibile', ADD_TO_CART: false },
  all_promo_offers: [
    {
      promo_code: '26-PUGLIA',
      promo_row: 2,
      promo_title: 'PROMO PUGLIA',
      promo_type: 'RigaPrezzoNettoQuantitaMinima',
      promo_qty_required: 12,
      promo_net_price: 1.2,
      promo_ref_list_price: 1.43,
      promo_extra_discounts: [0, 0, 0],
    },
    {
      promo_code: '26-SETTEMBRE',
      promo_row: 2,
      promo_title: 'CANVASS SETTEMBRE',
      promo_type: 'RigaPrezzoNettoQuantitaMinima',
      promo_qty_required: 12,
      promo_net_price: 1.2,
      promo_ref_list_price: 1.43,
      promo_extra_discounts: [0, 0, 0],
    },
  ],
} as any;

describe('TimeProductCard offers CTA', () => {
  beforeEach(() => {
    mocks.auth.isAuthorized = true;
  });

  it('says VEDI OFFERTE — the list row wording — for an article whose promos still need picking', () => {
    render(<TimeProductCard lang="it" product={product} priceData={bf00811} />);

    expect(screen.getByText('VEDI OFFERTE')).toBeInTheDocument();
    expect(screen.queryByText('Visualizza')).toBeNull();
    // The badge keeps stating the STATE next to the availability, so the card
    // never says the same words twice.
    expect(screen.getByText('In offerta')).toBeInTheDocument();
  });

  it('keeps the generic Visualizza CTA when nothing is on offer', () => {
    render(
      <TimeProductCard
        lang="it"
        product={product}
        priceData={
          {
            availability: 0,
            net_price: 1.43,
            gross_price: 1.43,
            product_label_action: {
              LABEL: 'Non disponibile',
              ADD_TO_CART: false,
            },
          } as any
        }
      />,
    );

    expect(screen.getByText('Visualizza')).toBeInTheDocument();
    expect(screen.queryByText('VEDI OFFERTE')).toBeNull();
  });

  it('a guest gets no PROMO badge and no "In offerta" label, even when PIM flags the product', () => {
    mocks.auth.isAuthorized = false;
    render(
      <TimeProductCard
        lang="it"
        product={{ ...product, has_active_promo: true }}
        priceData={undefined}
      />,
    );
    expect(screen.queryByText('PROMO')).toBeNull();
    expect(screen.queryByText('In offerta')).toBeNull();
    expect(screen.queryByText('VEDI OFFERTE')).toBeNull();
  });
});
