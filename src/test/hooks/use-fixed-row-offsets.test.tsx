import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  HEADER_HEIGHT_VAR,
  useFixedRowOffsets,
} from '@/hooks/use-fixed-row-offsets';
import type { HeaderRow } from '@/lib/home-settings/types';

/**
 * Anything pinned below the header (the catalog filter sidebar first of all)
 * reads the measured header height off <html>. A tenant can add, remove,
 * resize or unpin header rows in the builder, so the value has to come from
 * the DOM rather than from a constant.
 */
const ROW_HEIGHT = 48;

// jsdom ships no ResizeObserver; the hook only uses it to re-measure, so a
// no-op is enough for these assertions.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver ??= NoopResizeObserver;

function Probe({ rows }: { rows: HeaderRow[] }) {
  const { offsets, totalHeight, setRowRef } = useFixedRowOffsets(rows);
  return (
    <div data-testid="probe" data-total={totalHeight}>
      {rows.map((row) => (
        <div
          key={row.id}
          ref={(el) => setRowRef(row.id, el)}
          data-testid={`row-${row.id}`}
          data-top={offsets[row.id] ?? ''}
        />
      ))}
    </div>
  );
}

const row = (id: string, over: Partial<HeaderRow> = {}) =>
  ({ id, enabled: true, fixed: true, blocks: [], ...over }) as any as HeaderRow;

/** jsdom reports 0 for every box, so stub the measurement it relies on. */
function stubHeights(height = ROW_HEIGHT) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { height, width: 0, top: 0, left: 0, right: 0, bottom: 0 } as any;
  };
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

describe('useFixedRowOffsets', () => {
  it('publishes the summed height of the pinned rows on <html>', () => {
    const restore = stubHeights();
    try {
      const { getByTestId } = render(
        <Probe rows={[row('logo'), row('nav')]} />,
      );

      expect(
        document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR),
      ).toBe(`${ROW_HEIGHT * 2}px`);
      expect(getByTestId('probe').dataset.total).toBe(String(ROW_HEIGHT * 2));
      // Second row pins below the first — the offsets keep their meaning.
      expect(getByTestId('row-logo').dataset.top).toBe('0');
      expect(getByTestId('row-nav').dataset.top).toBe(String(ROW_HEIGHT));
    } finally {
      restore();
    }
  });

  it('counts only the rows that actually pin', () => {
    const restore = stubHeights();
    try {
      render(
        <Probe
          rows={[
            row('logo'),
            row('promo', { fixed: false }),
            row('off', { enabled: false }),
            row('nav'),
          ]}
        />,
      );

      expect(
        document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR),
      ).toBe(`${ROW_HEIGHT * 2}px`);
    } finally {
      restore();
    }
  });

  it('clears the variable when the header unmounts', () => {
    const restore = stubHeights();
    try {
      render(<Probe rows={[row('logo')]} />);
      expect(
        document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR),
      ).toBe(`${ROW_HEIGHT}px`);

      cleanup();
      // Consumers fall back to their own default rather than pinning to a
      // header that is no longer on the page.
      expect(
        document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR),
      ).toBe('');
    } finally {
      restore();
    }
  });
});
