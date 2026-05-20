import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const useThemeIdMock = vi.fn();
vi.mock('@/contexts/tenant.context', () => ({
  useThemeId: () => useThemeIdMock(),
}));

vi.mock('@components/themes/time/category/time-catalogue-index', () => ({
  default: () => <div data-testid="time-catalogue-index" />,
}));

const usePimCategoriesQueryMock = vi.fn();
vi.mock('@framework/product/get-pim-categories', () => ({
  usePimCategoriesQuery: () => usePimCategoriesQueryMock(),
}));

vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: {} }),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));

vi.mock('@framework/product/get-pim-product', () => ({
  usePimProductListQuery: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@components/category/category-children-carousel', () => ({
  default: () => <div data-testid="children-carousel" />,
}));
vi.mock('@components/category/category-subcategories-grid', () => ({
  default: () => <div data-testid="subcategories-grid" />,
}));
vi.mock('@components/product/products-carousel', () => ({
  default: () => <div data-testid="products-carousel" />,
}));
vi.mock('@components/cards/banner-card', () => ({
  default: () => <div data-testid="banner-card" />,
}));
vi.mock('@components/ui/category-breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}));
vi.mock('@components/ui/container', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

import CategoryPage from '@components/category/category-page';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  const children = p.children ?? [];
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    ...p,
    children,
    isGroup: children.length > 0,
  } as MenuTreeNode;
}

const tree: MenuTreeNode[] = [
  node({
    id: 'g1',
    slug: 'g1',
    path: ['g1'],
    children: [node({ id: 'l1', slug: 'l1', path: ['g1', 'l1'] })],
  }),
];

beforeEach(() => {
  usePimCategoriesQueryMock.mockReturnValue({
    data: { menuItems: tree, flat: [] },
    isLoading: false,
    isError: false,
  });
});

describe('CategoryPage theme branch', () => {
  it('renders TimeCatalogueIndex for the time theme at the root', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={[]} />);
    expect(screen.getByTestId('time-catalogue-index')).toBeInTheDocument();
  });

  it('renders TimeCatalogueIndex for the time theme on a non-leaf group page', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={['g1']} />);
    expect(screen.getByTestId('time-catalogue-index')).toBeInTheDocument();
  });

  it('does NOT render TimeCatalogueIndex for the time theme on a leaf page', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={['g1', 'l1']} />);
    expect(screen.queryByTestId('time-catalogue-index')).toBeNull();
    expect(screen.getByTestId('products-carousel')).toBeInTheDocument();
  });

  it('does NOT render TimeCatalogueIndex for the default theme', () => {
    useThemeIdMock.mockReturnValue('default');
    render(<CategoryPage lang="it" slug={[]} />);
    expect(screen.queryByTestId('time-catalogue-index')).toBeNull();
    expect(screen.getByTestId('children-carousel')).toBeInTheDocument();
  });
});
