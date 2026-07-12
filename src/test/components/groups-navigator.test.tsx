import { beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  router: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/it/search',
  useRouter: () => mocks.router,
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));

vi.mock('@framework/product/get-pim-menu', () => ({
  usePimMenuQuery: () => ({
    data: {
      menuItems: [
        {
          id: 'g1',
          slug: 'calzature',
          name: 'Calzature',
          label: 'Calzature',
          url: '/search?filters-attribute_erp_groups_ss=G1',
          path: ['calzature'],
          isGroup: false,
          children: [],
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@framework/product/get-pim-filters', () => ({
  fetchPimFilters: vi.fn().mockResolvedValue([
    {
      key: 'attribute_erp_groups_ss',
      label: 'Gruppi',
      values: [{ value: 'G1', label: 'Calzature', count: 2 }],
    },
  ]),
}));

import { fetchPimFilters } from '@framework/product/get-pim-filters';
import { GroupsNavigator } from '@/components/search/groups-navigator';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('GroupsNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams(
      'source=likes&filters-brand_id=BASE&filters-attribute_erp_groups_ss=G1',
    );
  });

  it('passes special-source SKU filters to the group facet query', async () => {
    renderWithQuery(
      <GroupsNavigator
        lang="it"
        extraFilters={{ 'filters-sku': 'SKU-A;SKU-B' }}
      />,
    );

    await waitFor(() => {
      expect(fetchPimFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          lang: 'it',
          'filters-brand_id': 'BASE',
          'filters-sku': 'SKU-A;SKU-B',
          facet_fields: ['attribute_erp_groups_ss'],
        }),
      );
    });

    expect(fetchPimFilters).not.toHaveBeenCalledWith(
      expect.objectContaining({
        'filters-attribute_erp_groups_ss': 'G1',
      }),
    );
  });

  it('does not fetch group facets when disabled', async () => {
    renderWithQuery(
      <GroupsNavigator
        lang="it"
        extraFilters={{ 'filters-sku': 'SKU-A;SKU-B' }}
        enabled={false}
      />,
    );

    await waitFor(() => {
      expect(fetchPimFilters).not.toHaveBeenCalled();
    });
  });
});
