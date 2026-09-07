'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { HeaderRow } from '@/lib/home-settings/types';

/** The <html> custom property carrying the measured pinned-header height. */
export const HEADER_HEIGHT_VAR = '--vinc-header-height';

/**
 * Computes per-row sticky top offsets so the header honors each row's
 * Fixed / Scroll flag (`HeaderRow.fixed`).
 *
 * Non-fixed rows scroll away (static). Each fixed row pins at the cumulative
 * height of the fixed rows pinned above it, producing true "islands": a
 * non-fixed row between two fixed rows scrolls under the upper one.
 *
 * Row heights are dynamic (the builder `height` is optional), so the fixed
 * rows are measured at layout time and re-measured on resize.
 *
 * The total pinned height is also published on <html> as
 * `--vinc-header-height`, so anything sticking below the header (the catalog
 * filter sidebar, side navs, summary panels) can pin to the real header
 * instead of a hardcoded guess that breaks as soon as a tenant adds, removes
 * or resizes a fixed row in the header builder.
 *
 * Returns `offsets` (rowId -> top px, fixed rows only), `totalHeight` (the
 * summed height of the pinned rows) and `setRowRef`, a ref callback the header
 * attaches to every rendered row wrapper.
 */
export function useFixedRowOffsets(rows: HeaderRow[]) {
  const refs = useRef<Map<string, HTMLElement>>(new Map());
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [totalHeight, setTotalHeight] = useState(0);

  const setRowRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) refs.current.set(id, el);
    else refs.current.delete(id);
  }, []);

  useLayoutEffect(() => {
    const compute = () => {
      let acc = 0;
      const next: Record<string, number> = {};
      for (const row of rows) {
        if (!row.enabled || !row.fixed) continue;
        next[row.id] = acc;
        const el = refs.current.get(row.id);
        acc += el ? el.getBoundingClientRect().height : 0;
      }
      setOffsets((prev) => {
        const keys = Object.keys(next);
        const same =
          keys.length === Object.keys(prev).length &&
          keys.every((k) => prev[k] === next[k]);
        return same ? prev : next;
      });
      setTotalHeight(acc);
      // Published rather than passed down: the consumers live in sibling
      // subtrees (search sidebar, account nav, checkout summary), so a CSS
      // custom property reaches them without threading a prop through the
      // whole page layout.
      document.documentElement.style.setProperty(
        HEADER_HEIGHT_VAR,
        `${Math.round(acc)}px`,
      );
    };

    compute();

    const ro = new ResizeObserver(compute);
    refs.current.forEach((el) => ro.observe(el));
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
      // Leaving a stale height behind would pin sidebars to a header that is
      // no longer mounted; consumers fall back to their own default instead.
      document.documentElement.style.removeProperty(HEADER_HEIGHT_VAR);
    };
  }, [rows]);

  return { offsets, totalHeight, setRowRef };
}
