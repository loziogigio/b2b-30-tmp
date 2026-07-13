import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverFetchPimProductsMock = vi.fn();

vi.mock('@/lib/pim/server-fetch', () => ({
  serverFetchPimProducts: (...args: any[]) =>
    serverFetchPimProductsMock(...args),
}));
vi.mock('@components/ui/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import CategorySeoProducts from '@/components/category/category-seo-products';

beforeEach(() => {
  serverFetchPimProductsMock.mockReset();
});

describe('CategorySeoProducts product links', () => {
  it('links the final-leaf SSR grid directly to localized flat product slugs', async () => {
    serverFetchPimProductsMock.mockResolvedValueOnce({
      results: [
        {
          sku: 'SKU-1',
          slug: { it: 'lampada-led', en: 'led-lamp' },
          name: 'Lampada LED',
        },
      ],
      total: 1,
      facets: {},
    });

    const element = await CategorySeoProducts({
      lang: 'it',
      basePath: '/it/prodotti/illuminazione/lampade',
      searchText: '',
      categoryId: 'cat-lampade',
      page: 1,
      heading: 'Lampade',
    });
    render(element);

    expect(screen.getByRole('link', { name: /Lampada LED/i })).toHaveAttribute(
      'href',
      '/it/lampada-led',
    );
    expect(serverFetchPimProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { category_ancestors: 'cat-lampade' },
      }),
    );
  });
});
