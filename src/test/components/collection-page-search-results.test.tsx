import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The collection detail page renders the themed SearchResults slot, scoped to
 * its own slug. Before this it called ProductB2BSearch directly: no facets,
 * and the default theme's chrome even for tenants on the time theme.
 */

vi.mock('@/lib/theme/registry', () => ({
  getThemedComponent: () => (props: any) => (
    <div
      data-testid="themed-search-results"
      data-collection={props.collectionSlug ?? ''}
      data-lang={props.lang ?? ''}
    >
      {props.header}
    </div>
  ),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@components/ui/container', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const useCollectionMock = vi.fn();
vi.mock('@framework/collections/use-collections', () => ({
  useCollection: (slug: string) => useCollectionMock(slug),
}));

import CollectionDetailContent from '@/app/[lang]/(default)/collections/[slug]/collection-detail-content';

function loaded(overrides: Record<string, any> = {}) {
  useCollectionMock.mockReturnValue({
    data: {
      name: 'Cucina',
      description: '',
      product_count: 128,
      ...overrides,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('CollectionDetailContent', () => {
  it('renders the themed search results scoped to the collection slug', () => {
    loaded();
    render(<CollectionDetailContent lang="it" slug="cucina" />);

    const results = screen.getByTestId('themed-search-results');
    expect(results.dataset.collection).toBe('cucina');
    expect(results.dataset.lang).toBe('it');
  });

  it('puts the collection header inside the results column, not above it', () => {
    // Full-width above the layout, the header pushed the facet column down the
    // page; handed to the results component it sits over the grid instead and
    // the facets start at the top.
    loaded();
    render(<CollectionDetailContent lang="it" slug="cucina" />);

    const heading = screen.getByRole('heading', { name: 'Cucina' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId('themed-search-results').contains(heading)).toBe(
      true,
    );
  });

  it('leaves the breadcrumb full-width above the layout', () => {
    loaded();
    render(<CollectionDetailContent lang="it" slug="cucina" />);
    const nav = screen.getByLabelText('Breadcrumb');
    expect(screen.getByTestId('themed-search-results').contains(nav)).toBe(
      false,
    );
  });

  it('renders no results block while the collection is loading', () => {
    useCollectionMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<CollectionDetailContent lang="it" slug="cucina" />);
    expect(
      screen.queryByTestId('themed-search-results'),
    ).not.toBeInTheDocument();
  });

  it('renders no results block when the collection is missing', () => {
    useCollectionMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('nope'),
      refetch: vi.fn(),
    });
    render(<CollectionDetailContent lang="it" slug="cucina" />);
    expect(
      screen.queryByTestId('themed-search-results'),
    ).not.toBeInTheDocument();
  });
});
