import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `/it/search` and `/it/collections/<slug>` render the same sidebar + grid.
 * The collection page used to render a bare product grid with no facets at
 * all, and — because it never went through the theme registry — the default
 * chrome even on a time-theme tenant. One component per theme, reused by both
 * routes, is what keeps them from drifting apart again.
 */

const themeIdMock = vi.fn(() => 'time');
vi.mock('@/contexts/tenant.context', () => ({
  useThemeId: () => themeIdMock(),
}));
vi.mock('react-scroll', () => ({
  Element: ({ children, className }: any) => (
    <div data-testid="grid-element" className={className}>
      {children}
    </div>
  ),
}));
vi.mock('@components/search/search-filter-drawer', () => ({
  default: ({ children }: any) => (
    <div data-testid="filter-drawer">{children}</div>
  ),
}));
vi.mock('@components/themes/time/search/time-search-filters', () => ({
  default: ({ collectionSlug }: any) => (
    <div data-testid="time-filters" data-collection={collectionSlug ?? ''} />
  ),
}));
vi.mock('@components/themes/time/search/time-product-search', () => ({
  TimeProductSearch: ({ collectionSlug }: any) => (
    <div data-testid="time-grid" data-collection={collectionSlug ?? ''} />
  ),
}));
vi.mock('@components/search/filters-b2b', () => ({
  SearchFiltersB2B: ({ collectionSlug }: any) => (
    <div data-testid="default-filters" data-collection={collectionSlug ?? ''} />
  ),
}));
vi.mock('@components/product/product-b2b-search', () => ({
  ProductB2BSearch: ({ collectionSlug }: any) => (
    <div data-testid="default-grid" data-collection={collectionSlug ?? ''} />
  ),
}));

import TimeSearchResults from '@components/themes/time/search/time-search-results';
import DefaultSearchResults from '@components/themes/default/search/default-search-results';

describe.each([
  {
    name: 'time',
    Component: TimeSearchResults,
    filters: 'time-filters',
    grid: 'time-grid',
  },
  {
    name: 'default',
    Component: DefaultSearchResults,
    filters: 'default-filters',
    grid: 'default-grid',
  },
])('$name search results layout', ({ Component, filters, grid }) => {
  it('renders the facet sidebar next to the product grid', () => {
    render(<Component lang="it" text="pentola" />);
    expect(screen.getAllByTestId(filters).length).toBeGreaterThan(0);
    expect(screen.getByTestId(grid)).toBeInTheDocument();
  });

  it('forwards the collection scope to both the grid and the facets', () => {
    render(<Component lang="it" collectionSlug="cucina" />);
    expect(screen.getByTestId(grid).dataset.collection).toBe('cucina');
    for (const node of screen.getAllByTestId(filters)) {
      expect(node.dataset.collection).toBe('cucina');
    }
  });

  it('leaves the scope empty on the plain search page', () => {
    render(<Component lang="it" text="pentola" />);
    expect(screen.getByTestId(grid).dataset.collection).toBe('');
  });

  it('renders the page header inside the content column, above the grid', () => {
    // The collection title block lives here rather than full-width above the
    // whole layout, so the facet column starts at the top of the page.
    render(
      <Component
        lang="it"
        collectionSlug="cucina"
        header={<h1 data-testid="page-header">Cucina</h1>}
      />,
    );

    const heading = screen.getByTestId('page-header');
    const gridNode = screen.getByTestId(grid);
    const column = heading.parentElement!;

    expect(column.contains(gridNode)).toBe(true);
    // DOCUMENT_POSITION_FOLLOWING === 4: the grid comes after the header.
    expect(
      heading.compareDocumentPosition(gridNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('leaves the content column alone when no header is given', () => {
    render(<Component lang="it" text="pentola" />);
    expect(screen.queryByTestId('page-header')).not.toBeInTheDocument();
  });

  it('keeps the header out of the facet sidebar', () => {
    render(
      <Component
        lang="it"
        collectionSlug="cucina"
        header={<h1 data-testid="page-header">Cucina</h1>}
      />,
    );
    for (const node of screen.getAllByTestId(filters)) {
      expect(node.contains(screen.getByTestId('page-header'))).toBe(false);
    }
  });

  it('offers exactly one mobile filter drawer, holding the same facets', () => {
    render(<Component lang="it" collectionSlug="cucina" />);
    const drawers = screen.getAllByTestId('filter-drawer');
    expect(drawers).toHaveLength(1);
    expect(
      drawers[0].querySelector(`[data-testid="${filters}"]`),
    ).not.toBeNull();
  });
});

describe('theme registry wiring', () => {
  it('resolves the SearchResults slot to the tenant theme', async () => {
    const { getThemedComponent } = await import('@/lib/theme/registry');
    const Slot = getThemedComponent<{ lang: string; collectionSlug?: string }>(
      'SearchResults',
    );

    themeIdMock.mockReturnValue('time');
    const { unmount } = render(<Slot lang="it" collectionSlug="cucina" />);
    expect(await screen.findByTestId('time-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('default-grid')).not.toBeInTheDocument();
    unmount();

    themeIdMock.mockReturnValue('default');
    render(<Slot lang="it" collectionSlug="cucina" />);
    expect(await screen.findByTestId('default-grid')).toBeInTheDocument();
  });
});
