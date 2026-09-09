import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

/**
 * The collection page reuses the search sidebar. Its product grid is already
 * narrowed to one collection (`filters.collection_slugs`), so the facet query
 * has to carry the same narrowing — otherwise the sidebar counts the whole
 * catalogue next to a collection-sized result list and the numbers disagree.
 */

const queryKeys: any[] = [];

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => {
    queryKeys.push(opts.queryKey);
    return { data: [], isLoading: false, isFetching: false, error: null };
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/it/collections/cucina',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: {} }),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true }),
}));
vi.mock('@components/search/selected-filters', () => ({
  default: () => <div data-testid="selected-filters" />,
}));
vi.mock('@components/search/groups-navigator', () => ({
  GroupsNavigator: (props: any) => (
    <div
      data-testid="groups-navigator"
      data-collection={props.extraFilters?.['filters-collection_slugs'] ?? ''}
    />
  ),
  GroupsBreadcrumb: () => <div data-testid="groups-breadcrumb" />,
}));
vi.mock('@components/search/category-navigator', () => ({
  CategoryNavigator: () => <div data-testid="category-navigator" />,
}));
vi.mock('@components/search/tech-specs-filters', () => ({
  TechSpecsFilters: () => <div data-testid="tech-specs" />,
}));
vi.mock('@components/search/product-type-breadcrumb', () => ({
  ProductTypeBreadcrumb: () => <div data-testid="product-type-breadcrumb" />,
}));
vi.mock('@components/search/filters-b2b-item', () => ({
  FiltersB2BItem: () => <div data-testid="filters-item" />,
}));

import { SearchFiltersB2B } from '@components/search/filters-b2b';

function facetParams() {
  const key = queryKeys.find((k) => k?.[0] === 'pim-filters');
  return key?.[1] ?? {};
}

describe('SearchFiltersB2B collection scoping', () => {
  beforeEach(() => {
    queryKeys.length = 0;
  });

  it('sends the collection as a facet filter when scoped', () => {
    render(<SearchFiltersB2B lang="it" collectionSlug="cucina" />);
    expect(facetParams()['filters-collection_slugs']).toBe('cucina');
  });

  it('sends no collection filter on the plain search page', () => {
    render(<SearchFiltersB2B lang="it" text="pentola" />);
    expect(facetParams()).not.toHaveProperty('filters-collection_slugs');
  });

  it('loads facets on a collection page even with nothing typed', () => {
    // A collection IS the scope, so the blank-search short-circuit that keeps
    // the plain search page from facetting the whole catalogue must not fire.
    render(<SearchFiltersB2B lang="it" collectionSlug="cucina" />);
    expect(queryKeys.some((k) => k?.[0] === 'pim-filters')).toBe(true);
  });

  it('scopes the groups navigator count query to the collection too', () => {
    const { getByTestId } = render(
      <SearchFiltersB2B lang="it" collectionSlug="cucina" />,
    );
    expect(getByTestId('groups-navigator').dataset.collection).toBe('cucina');
  });
});
