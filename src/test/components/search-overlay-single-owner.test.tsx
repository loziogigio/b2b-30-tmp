import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/**
 * The header's SearchB2B is only CSS-hidden below the `lg` breakpoint, so it
 * stays mounted on phones and tablets. It used to open its own overlay on the
 * shared `displayMobileSearch` flag, while the layout's MobileSearchOverlay
 * opened a second one on the same flag. Both portal to document.body, so the
 * hidden wrapper suppressed neither: tapping the bottom-nav search icon stacked
 * two full-screen overlays, each with its own search text.
 *
 * Desktop had a cousin of the same bug: SearchB2B still rendered a legacy
 * `.overlay` backdrop from the old dropdown design, which faded in at a
 * different speed than the real overlay's own backdrop.
 */

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/it',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@framework/product/use-search', () => ({
  useSearchQuery: () => ({ data: undefined, isLoading: false }),
}));
// UIProvider's module also exports ManagedUIContext, which pulls in the cart,
// address, likes and reminders providers. None of them are under test.
vi.mock('@contexts/cart/cart.context', () => ({
  CartProvider: ({ children }: any) => children,
}));
vi.mock('@contexts/address/address.context', () => ({
  AddressProvider: ({ children }: any) => children,
}));
vi.mock('@contexts/likes/likes.context', () => ({
  LikesProvider: ({ children }: any) => children,
}));
vi.mock('@contexts/reminders/reminders.context', () => ({
  RemindersProvider: ({ children }: any) => children,
}));
vi.mock('@components/common/modal/modal.context', () => ({
  ModalProvider: ({ children }: any) => children,
  useModalState: () => ({ isOpen: false }),
}));
// Every themed SearchOverlay slot resolves to this probe, which records the
// `open` prop it was given instead of rendering the real panel.
vi.mock('@/lib/theme/registry', () => ({
  getThemedComponent: () => (props: any) => (
    <div data-testid="search-overlay" data-open={String(props.open)}>
      <input
        aria-label="overlay-input"
        value={props.value ?? ''}
        onChange={props.onChange}
      />
      <button type="button" onClick={props.onClose}>
        close-overlay
      </button>
    </div>
  ),
}));

import { UIProvider, useUI } from '@contexts/ui.context';
import SearchB2B from '@components/common/search-b2b';
import MobileSearchOverlay from '@/layouts/b2b/mobile-search-overlay';

function BottomNavSearchButton() {
  const { openMobileSearch } = useUI();
  return (
    <button type="button" onClick={openMobileSearch}>
      open-mobile-search
    </button>
  );
}

function renderStorefront() {
  return render(
    <UIProvider>
      {/* Header widget: the same wrapper the search widgets use */}
      <div className="hidden lg:flex">
        <SearchB2B searchId="header-search" lang="it" />
      </div>
      {/* Layout-level mobile overlay */}
      <MobileSearchOverlay lang="it" />
      <BottomNavSearchButton />
    </UIProvider>,
  );
}

const openOverlays = () =>
  screen
    .queryAllByTestId('search-overlay')
    .filter((el) => el.dataset.open === 'true');

describe('search overlay ownership', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('the bottom-nav search button opens exactly one overlay', () => {
    renderStorefront();
    expect(openOverlays()).toHaveLength(0);

    fireEvent.click(screen.getByText('open-mobile-search'));

    expect(openOverlays()).toHaveLength(1);
  });

  it('closing the mobile overlay leaves nothing open', () => {
    renderStorefront();
    fireEvent.click(screen.getByText('open-mobile-search'));

    const [overlay] = openOverlays();
    fireEvent.click(overlay.querySelector('button')!);

    expect(openOverlays()).toHaveLength(0);
  });

  it('focusing the header input opens one overlay and no legacy backdrop', () => {
    const { container } = renderStorefront();

    fireEvent.focus(screen.getByLabelText('header-search'));

    expect(openOverlays()).toHaveLength(1);
    expect(container.querySelector('.overlay')).toBeNull();
  });
});
