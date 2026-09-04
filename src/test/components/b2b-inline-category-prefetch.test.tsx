import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import B2BInlineCategoryMenu from '@/layouts/header/b2b-inline-category-menu';
import { CategoryRootProvider } from '@/contexts/category-root.context';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock('@components/ui/link', () => ({
  default: ({ href, children, prefetch, ...props }: any) => (
    <a href={String(href)} data-prefetch={String(prefetch)} {...props}>
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

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe('B2BInlineCategoryMenu prefetch', () => {
  it('does not prefetch a category search merely because its link is visible', () => {
    render(
      <CategoryRootProvider categoryRoots={{ default: 'categorie' }}>
        <B2BInlineCategoryMenu lang="it" />
      </CategoryRootProvider>,
    );

    expect(screen.getByRole('link', { name: 'Cucina' })).toHaveAttribute(
      'data-prefetch',
      'false',
    );
  });
});
