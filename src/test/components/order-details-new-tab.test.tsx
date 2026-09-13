import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: null }),
}));
vi.mock('@framework/order/use-enriched-order-items', () => ({
  useEnrichedOrderItems: (items: any[]) => items,
}));
vi.mock('@components/orders/order-items-table', () => ({
  __esModule: true,
  default: () => <div data-testid="items" />,
}));

import OrderDetails from '@components/orders/order-details';

const erpOrder = {
  id: 'OC/1135/2026',
  cause: 'OC',
  doc_number: '1135',
  doc_year: '2026',
  tracking_number: '1135',
  total: 8162,
  created_at: '2026-08-07T00:00:00.000Z',
  shipping_address: {
    street_address: 'VIA PRAGA SNC',
    city: 'PALIANO',
    country: 'Italy',
  },
  items: [],
} as any;

describe('OrderDetails — "Dettagli" link', () => {
  it('opens the full detail page in a new tab so the list filters survive', () => {
    render(<OrderDetails order={erpOrder} lang="it" />);
    const link = screen.getByRole('link', { name: 'orders-view-details' });
    expect(link).toHaveAttribute(
      'href',
      '/it/account/order-detail?cause=OC&doc_year=2026&doc_number=1135',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
