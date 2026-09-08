import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  openModal: vi.fn(),
}));

vi.mock('@components/common/modal/modal.context', () => ({
  useModalAction: () => ({ openModal: mocks.openModal }),
}));
vi.mock('@contexts/cart/cart.context', () => ({
  useCart: () => ({ items: [] }),
}));

import {
  TimeAlreadyPurchasedBadge,
  TimeStatusBadges,
} from '@/components/themes/time/product/time-promo-gated-cta';

const t = (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k;

const priceData: any = {
  buy_did: true,
  buy_did_last_date: '31/07/2026',
  buy_did_amount: 48,
  entity_code: '53295',
  packaging_option_default: { packaging_uom: 'Nr' },
};

const product: any = { id: '53295', sku: 'BF05003', name: 'SCOLAPOSATE' };

beforeEach(() => vi.clearAllMocks());

describe('TimeAlreadyPurchasedBadge as the order-history trigger', () => {
  it.each([
    ['inline', { inline: true }],
    ['full', { full: true }],
    ['stacked', {}],
  ])('opens the history popup from the %s badge', (_label, variant) => {
    render(
      <TimeAlreadyPurchasedBadge
        priceData={priceData}
        product={product}
        t={t}
        {...(variant as any)}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).toHaveBeenCalledWith('ORDER_HISTORY_VIEW', {
      product,
      priceData,
    });
  });

  it('does not bubble the click up to the product card behind it', () => {
    const onCardClick = vi.fn();
    render(
      <div onClick={onCardClick}>
        <TimeAlreadyPurchasedBadge
          priceData={priceData}
          product={product}
          t={t}
          inline
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).toHaveBeenCalled();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('renders nothing when the customer never ordered the article', () => {
    const { container } = render(
      <TimeAlreadyPurchasedBadge
        priceData={{ ...priceData, buy_did: false }}
        product={product}
        t={t}
        inline
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('still renders when no product is supplied', () => {
    // The badge shows on surfaces that hold only price data; it must not
    // crash there, it just cannot fill the popup header.
    render(<TimeAlreadyPurchasedBadge priceData={priceData} t={t} inline />);
    fireEvent.click(screen.getByRole('button'));
    expect(mocks.openModal).toHaveBeenCalledWith('ORDER_HISTORY_VIEW', {
      product: undefined,
      priceData,
    });
  });
});

describe('TimeStatusBadges', () => {
  it('forwards the product to the history popup', () => {
    render(
      <TimeStatusBadges
        priceData={priceData}
        product={product}
        onPromoClick={vi.fn()}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Gi(à|a) ordinato/i }));

    expect(mocks.openModal).toHaveBeenCalledWith('ORDER_HISTORY_VIEW', {
      product,
      priceData,
    });
  });

  it('keeps the promo label working alongside the history badge', () => {
    // The badge states the STATE ("In offerta"); the CTA elsewhere on the card
    // carries the ACTION ("VEDI OFFERTE"), so the two never repeat each other.
    // It used to read "Vedi offerte" for multi-promo articles, but that keyed
    // off count_promo, which the ERP transform makes 0 for every article.
    const onPromoClick = vi.fn();
    render(
      <TimeStatusBadges
        priceData={{
          ...priceData,
          is_promo: true,
          all_promo_offers: [{ promo_code: 'A' }, { promo_code: 'B' }],
        }}
        product={{ ...product, has_active_promo: true }}
        onPromoClick={onPromoClick}
        t={t}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /In offerta/i }));

    expect(onPromoClick).toHaveBeenCalled();
    expect(mocks.openModal).not.toHaveBeenCalled();
  });
});
