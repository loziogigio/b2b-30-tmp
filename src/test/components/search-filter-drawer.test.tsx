import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/**
 * Below `lg` the facet sidebar is `hidden`, so phones had no way to reach the
 * filters at all. This drawer is the mobile route to them — and the ONLY owner
 * of the shared `displayFilter` flag. Two components opening on one flag, each
 * portaling to body, is how the search overlay ended up stacking two panels.
 */

const ui = { displayFilter: false, subs: new Set<() => void>() };

function useUIMock() {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    ui.subs.add(force);
    return () => {
      ui.subs.delete(force);
    };
  }, []);
  return {
    displayFilter: ui.displayFilter,
    openFilter: () => {
      ui.displayFilter = true;
      ui.subs.forEach((f) => f());
    },
    closeFilter: () => {
      ui.displayFilter = false;
      ui.subs.forEach((f) => f());
    },
  };
}

vi.mock('@contexts/ui.context', () => ({ useUI: () => useUIMock() }));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@components/common/drawer/drawer', () => ({
  Drawer: ({ open, children }: any) => (
    <div data-testid="filter-drawer" data-open={String(open)}>
      {children}
    </div>
  ),
}));

import SearchFilterDrawer from '@components/search/search-filter-drawer';

function renderDrawer() {
  return render(
    <SearchFilterDrawer lang="it">
      <div data-testid="facet-panel">facets</div>
    </SearchFilterDrawer>,
  );
}

describe('SearchFilterDrawer', () => {
  beforeEach(() => {
    ui.displayFilter = false;
    ui.subs.clear();
  });

  it('renders a single drawer, closed, with a Filtri trigger', () => {
    renderDrawer();
    expect(screen.getAllByTestId('filter-drawer')).toHaveLength(1);
    expect(screen.getByTestId('filter-drawer').dataset.open).toBe('false');
    expect(
      screen.getByRole('button', { name: /text-filters/ }),
    ).toBeInTheDocument();
  });

  it('does not mount the facet panel until the drawer is first opened', () => {
    renderDrawer();
    expect(screen.queryByTestId('facet-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /text-filters/ }));
    expect(screen.getByTestId('filter-drawer').dataset.open).toBe('true');
    expect(screen.getByTestId('facet-panel')).toBeInTheDocument();
  });

  it('keeps the panel mounted after closing so the slide-out is not empty', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /text-filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Vedi risultati' }));

    expect(screen.getByTestId('filter-drawer').dataset.open).toBe('false');
    expect(screen.getByTestId('facet-panel')).toBeInTheDocument();
  });

  it('closes from the header close button as well as Vedi risultati', () => {
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: /text-filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.getByTestId('filter-drawer').dataset.open).toBe('false');
  });

  it('reports its open state to assistive tech', () => {
    renderDrawer();
    const trigger = screen.getByRole('button', { name: /text-filters/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(
      screen.getByRole('button', { name: /text-filters/ }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides the trigger from lg up, where the real sidebar takes over', () => {
    renderDrawer();
    expect(
      screen.getByRole('button', { name: /text-filters/ }).className,
    ).toContain('lg:hidden');
  });
});
