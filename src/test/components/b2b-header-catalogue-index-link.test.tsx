import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import B2BHeaderMenu from '@/layouts/header/b2b-header-menu';
import { CategoryRootProvider } from '@/contexts/category-root.context';

/**
 * The drawer's "see all groups" link points at the catalogue index, which is
 * built from the PIM *categories* tree — a different source from the drawer's
 * own menu. Tenants whose groups live in an ERP facet have no categories tree,
 * so the link used to lead to an index page with a single dead entry on it.
 */

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock('@utils/use-window-size', () => ({
  default: () => ({ width: 390, height: 780 }),
}));

vi.mock('@components/ui/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@framework/product/get-pim-menu', () => ({
  usePimMenuQuery: () => ({
    data: {
      menuItems: [
        {
          id: 'cucina',
          slug: 'cucina',
          name: 'Cucina',
          label: 'Cucina',
          url: '/it/search?filters-attribute_erp_groups_ss=1CCN',
          path: ['cucina'],
          isGroup: false,
          children: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

const categoriesQuery = vi.fn();

vi.mock('@framework/product/get-pim-categories', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePimCategoriesQuery: () => categoriesQuery(),
}));

const category = (overrides: Record<string, unknown>) => ({
  external_code: null,
  product_count: 0,
  children: [],
  ...overrides,
});

function renderMenu() {
  render(
    <CategoryRootProvider categoryRoots={{ default: 'categorie' }}>
      <B2BHeaderMenu
        lang="it"
        renderTrigger={({ onClick }) => (
          <button type="button" onClick={onClick}>
            Open groups
          </button>
        )}
      />
    </CategoryRootProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open groups' }));
}

describe('B2BHeaderMenu catalogue-index link', () => {
  beforeEach(() => {
    categoriesQuery.mockReset();
  });

  it('hides the link when the categories tree is a lone dead placeholder', () => {
    categoriesQuery.mockReturnValue({
      data: {
        menuItems: [
          category({
            id: '0',
            slug: 'prodotti-0',
            name: 'Prodotti',
            label: 'Prodotti',
            path: ['prodotti-0'],
            isGroup: false,
          }),
        ],
      },
      isSuccess: true,
    });

    renderMenu();

    expect(screen.queryByTitle('See all groups')).toBeNull();
    // The drawer's own, working facet links are untouched.
    expect(screen.getByTitle('Cucina')).toBeInTheDocument();
  });

  it('keeps the link when the tenant has a real categories tree', () => {
    categoriesQuery.mockReturnValue({
      data: {
        menuItems: [
          category({
            id: 'calzature',
            slug: 'calzature',
            name: 'CALZATURE',
            label: 'CALZATURE',
            path: ['calzature'],
            isGroup: false,
            external_code: 'CALZ',
          }),
        ],
      },
      isSuccess: true,
    });

    renderMenu();

    expect(screen.getByTitle('See all groups')).toHaveAttribute(
      'href',
      '/it/categorie',
    );
  });

  it('keeps the link while the categories tree is still unknown', () => {
    // A PIM hiccup must not strip navigation out of the drawer.
    categoriesQuery.mockReturnValue({ data: undefined, isSuccess: false });

    renderMenu();

    expect(screen.getByTitle('See all groups')).toBeInTheDocument();
  });
});
