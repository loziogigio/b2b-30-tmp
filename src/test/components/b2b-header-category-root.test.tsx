import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import B2BHeaderMenu from '@/layouts/header/b2b-header-menu';
import { CategoryRootProvider } from '@/contexts/category-root.context';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock('@utils/use-window-size', () => ({
  default: () => ({ width: 1280, height: 800 }),
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
          id: 'leaf-1',
          slug: 'valvole',
          name: 'Valvole',
          label: 'Valvole',
          url: '/categorie/valvole',
          path: ['valvole'],
          isGroup: false,
          children: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

// The drawer checks the categories tree before offering its catalogue-index
// link; an unresolved query leaves the link in place, which is what this test
// is about. Link visibility itself is covered by
// `b2b-header-catalogue-index-link.test.tsx`.
vi.mock('@framework/product/get-pim-categories', () => ({
  usePimCategoriesQuery: () => ({ data: undefined, isSuccess: false }),
}));

describe('B2BHeaderMenu category root', () => {
  it('uses the server-hydrated locale root for root and leaf links', () => {
    render(
      <CategoryRootProvider
        categoryRoots={{ default: 'groups', it: 'prodotti' }}
      >
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

    expect(screen.getByTitle('See all groups')).toHaveAttribute(
      'href',
      '/it/prodotti',
    );
    expect(screen.getByTitle('Valvole')).toHaveAttribute(
      'href',
      '/it/prodotti/valvole',
    );
  });
});
