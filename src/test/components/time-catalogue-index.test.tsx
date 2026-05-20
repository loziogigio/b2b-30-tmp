import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

vi.mock('@components/ui/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={typeof href === 'string' ? href : '#'} className={className}>
      {children}
    </a>
  ),
}));

import TimeCatalogueIndex from '@components/themes/time/category/time-catalogue-index';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

beforeEach(() => {
  // jsdom has no IntersectionObserver
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    isGroup: (p.children?.length ?? 0) > 0,
    children: [],
    ...p,
  } as MenuTreeNode;
}

const tree: MenuTreeNode[] = [
  node({
    id: 'g1',
    slug: 'g1',
    label: 'Group One',
    path: ['g1'],
    children: [
      node({
        id: 'l1',
        slug: 'valvole',
        label: 'Valvole',
        path: ['g1', 'valvole'],
      }),
      node({
        id: 'l2',
        slug: 'raccordi',
        label: 'Raccordi',
        path: ['g1', 'raccordi'],
      }),
      node({
        id: 'sg1',
        slug: 'edilizia',
        label: 'Edilizia',
        path: ['g1', 'edilizia'],
        children: [
          node({
            id: 'l3',
            slug: 'cazzuole',
            label: 'Cazzuole',
            path: ['g1', 'edilizia', 'cazzuole'],
          }),
        ],
      }),
    ],
  }),
];

describe('TimeCatalogueIndex', () => {
  it('renders a section heading and leaf links pointing at the category route', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(
      screen.getByRole('heading', { name: 'Group One' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Valvole/ })).toHaveAttribute(
      'href',
      '/it/categorie/g1/valvole',
    );
  });

  it('renders the sub-group heading and its nested leaf', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(screen.getByText('Edilizia')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cazzuole/ })).toHaveAttribute(
      'href',
      '/it/categorie/g1/edilizia/cazzuole',
    );
  });

  it('links "view all" to the group page', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(
      screen.getByRole('link', { name: 'Tutto il gruppo' }),
    ).toHaveAttribute('href', '/it/categorie/g1');
  });

  it('filters leaves by the search query', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    fireEvent.change(screen.getByLabelText('Cerca una categoria…'), {
      target: { value: 'valv' },
    });
    expect(screen.getByRole('link', { name: /Valvole/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Raccordi/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Cazzuole/ })).toBeNull();
  });

  it('shows the empty state when nothing matches', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    fireEvent.change(screen.getByLabelText('Cerca una categoria…'), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText('Nessuna categoria trovata')).toBeInTheDocument();
  });

  it('shows a results count when filtering', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    fireEvent.change(screen.getByLabelText('Cerca una categoria…'), {
      target: { value: 'valv' },
    });
    expect(screen.getByText('1 categorie trovate')).toBeInTheDocument();
  });

  it('clears the query when the clear button is clicked', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    const input = screen.getByLabelText(
      'Cerca una categoria…',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'valv' } });
    expect(screen.queryByRole('link', { name: /Raccordi/ })).toBeNull();
    fireEvent.click(screen.getByLabelText('Cancella ricerca'));
    expect(input.value).toBe('');
    expect(screen.getByRole('link', { name: /Raccordi/ })).toBeInTheDocument();
  });
});
