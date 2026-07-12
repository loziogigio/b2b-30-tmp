import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act, waitFor, within } from '@testing-library/react';

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

describe('SearchTabs hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.searchParams = new URLSearchParams();
  });

  it('hydrates without rendering the auth-only tab too early', async () => {
    const serverHtml = renderToString(<SearchTabs lang="it" />);
    expect(serverHtml).not.toContain('Preferiti');

    const container = document.createElement('div');
    container.innerHTML = serverHtml;
    document.body.appendChild(container);
    const recoverableErrors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, <SearchTabs lang="it" />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    await waitFor(() => {
      expect(within(container).getByTitle('Preferiti')).toBeInTheDocument();
    });
    expect(recoverableErrors).toEqual([]);

    await act(async () => root.unmount());
    container.remove();
  });
});
