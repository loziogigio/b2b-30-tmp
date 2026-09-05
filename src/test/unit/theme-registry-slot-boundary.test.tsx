import React, { Suspense, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

/**
 * Themed slots load their theme module lazily. In the app router,
 * `next/dynamic({ ssr: true })` without a `loading` option renders that lazy
 * component bare - no Suspense boundary of its own - so the first client-side
 * render of a slot suspends up to whatever boundary already encloses it, and
 * React hides that boundary's visible content until the chunk arrives. On the
 * storefront that was the search overlay "opening, closing and opening again"
 * on the very first click: the trending carousel's product cards are a themed
 * slot, and the boundary above them wraps the whole header search widget.
 */

vi.mock('@/contexts/tenant.context', () => ({ useThemeId: () => 'time' }));

// Faithful to next/dist/shared/lib/lazy-dynamic/loadable.js: ssr without a
// loading component wraps the lazy in a Fragment, not a Suspense boundary.
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<any>, opts: any = {}) => {
    const Lazy = React.lazy(() =>
      loader().then((mod: any) => ({ default: mod.default ?? mod })),
    );
    const hasBoundary = opts.ssr === false || !!opts.loading;
    return function LoadableComponent(props: any) {
      const child = <Lazy {...props} />;
      return hasBoundary ? (
        <Suspense fallback={opts.loading ? <opts.loading /> : null}>
          {child}
        </Suspense>
      ) : (
        child
      );
    };
  },
}));

// The slot module resolves only when the test says so, like a chunk in flight.
const gate = vi.hoisted(() => {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
});
vi.mock('@/components/themes/time/product/time-product-card', async () => {
  await gate.promise;
  return { default: () => <div data-testid="themed-card">card</div> };
});

import { getThemedComponent } from '@/lib/theme/registry';

const ThemedCard = getThemedComponent('ProductCard');

function Widget() {
  const [showCard, setShowCard] = useState(false);
  return (
    <Suspense fallback={<div data-testid="widget-fallback" />}>
      <div data-testid="already-visible">header search</div>
      <button type="button" onClick={() => setShowCard(true)}>
        open
      </button>
      {showCard && <ThemedCard />}
    </Suspense>
  );
}

describe('themed slot loading', () => {
  it('does not hide already-visible content of the enclosing boundary while a slot chunk loads', async () => {
    render(<Widget />);
    expect(screen.getByTestId('already-visible')).toBeVisible();

    await act(async () => {
      screen.getByText('open').click();
      await Promise.resolve();
    });

    // The chunk is still in flight: the header must stay visible and the
    // widget-level fallback must not take over.
    expect(screen.getByTestId('already-visible')).toBeVisible();
    expect(screen.queryByTestId('widget-fallback')).toBeNull();

    await act(async () => {
      gate.open();
      await gate.promise;
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(await screen.findByTestId('themed-card')).toBeInTheDocument();
    expect(screen.getByTestId('already-visible')).toBeVisible();
  });
});
