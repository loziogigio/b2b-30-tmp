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

function storedTabs(): Array<{ label: string; query: string }> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function isActive(label: string): boolean {
  return !!screen
    .getByText(label)
    .closest('div')
    ?.className.includes('bg-white');
}

describe('SearchTabs – searching again after the Preferiti view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.searchParams = new URLSearchParams();
  });

  it('opens a new tab for a new search instead of crashing on the empty active slot', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', key: 'text=vite', label: 'vite', query: 'text=vite' },
      ]),
    );
    mocks.searchParams = new URLSearchParams('source=likes&page_size=12');
    const { rerender } = render(<SearchTabs lang="it" />);
    await act(async () => {});

    mocks.searchParams = new URLSearchParams('text=rossi');
    await act(async () => {
      rerender(<SearchTabs lang="it" />);
    });

    // The stored tab survives and the new search gets its own, active tab
    expect(screen.getByText('vite')).toBeInTheDocument();
    expect(screen.getByText('rossi')).toBeInTheDocument();
    expect(isActive('rossi')).toBe(true);
    expect(storedTabs().map((t) => t.label)).toEqual(['vite', 'rossi']);
  });

  it('re-activates the matching tab when the search repeats an existing one', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'a', key: 'text=vite', label: 'vite', query: 'text=vite' },
        { id: 'b', key: 'text=rossi', label: 'rossi', query: 'text=rossi' },
      ]),
    );
    mocks.searchParams = new URLSearchParams('source=likes&page_size=12');
    const { rerender } = render(<SearchTabs lang="it" />);
    await act(async () => {});

    mocks.searchParams = new URLSearchParams('text=vite');
    await act(async () => {
      rerender(<SearchTabs lang="it" />);
    });

    expect(isActive('vite')).toBe(true);
    expect(storedTabs().map((t) => t.label)).toEqual(['vite', 'rossi']);
  });
});
