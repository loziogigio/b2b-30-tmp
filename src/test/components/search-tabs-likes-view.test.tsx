import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  router: { replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/it/search',
  useRouter: () => mocks.router,
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: true }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

import SearchTabs from '@/components/search/search-tabs';

const STORAGE_KEY = 'b2b-search-tabs';
const SEARCH_TAB_LABEL = 'text-search-tab'; // mocked t() returns the key

function storedTabs(): Array<{ label: string; query: string }> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

describe('SearchTabs – Preferiti (source=likes) view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.searchParams = new URLSearchParams();
  });

  it('does not create a "Ricerca" tab when landing on the likes view', async () => {
    mocks.searchParams = new URLSearchParams('source=likes&page_size=12');

    await act(async () => {
      render(<SearchTabs lang="it" />);
    });

    expect(screen.queryByText(SEARCH_TAB_LABEL)).toBeNull();
    expect(storedTabs()).toEqual([]);
  });

  it('keeps existing search tabs untouched when switching to likes', async () => {
    mocks.searchParams = new URLSearchParams('text=vite');
    const { rerender } = render(<SearchTabs lang="it" />);
    await act(async () => {});
    expect(screen.getByText('vite')).toBeInTheDocument();

    mocks.searchParams = new URLSearchParams('source=likes&page_size=12');
    await act(async () => {
      rerender(<SearchTabs lang="it" />);
    });

    // The "vite" tab must still be there and must not be relabeled "Ricerca"
    expect(screen.getByText('vite')).toBeInTheDocument();
    expect(screen.queryByText(SEARCH_TAB_LABEL)).toBeNull();
    expect(storedTabs()).toEqual([
      expect.objectContaining({ label: 'vite', query: 'text=vite' }),
    ]);
    // No search tab is highlighted as active while Preferiti is shown
    expect(screen.getByText('vite').closest('div')?.className).not.toContain(
      'bg-white',
    );
  });

  it('drops previously persisted likes tabs from localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', key: 'text=vite', label: 'vite', query: 'text=vite' },
        {
          id: 'b',
          key: 'page_size=12&source=likes',
          label: 'Ricerca',
          query: 'page_size=12&source=likes',
        },
      ]),
    );
    mocks.searchParams = new URLSearchParams('text=vite');

    await act(async () => {
      render(<SearchTabs lang="it" />);
    });

    expect(screen.queryByText('Ricerca')).toBeNull();
    expect(storedTabs().map((t) => t.label)).toEqual(['vite']);
  });
});
