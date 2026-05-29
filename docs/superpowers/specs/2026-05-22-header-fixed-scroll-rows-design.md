# Header rows: honor per-row Fixed / Scroll

**Date:** 2026-05-22
**Scope:** vinc-b2b header rendering — `time` and `default` themes.

## Problem

The header builder lets each row be marked **Fixed** or **Scroll** (`HeaderRow.fixed`).
Neither renderer honors it:

- **Time** (`time-header.tsx`) wraps every row in one `sticky top-0 z-[100]` `<header>`,
  so all rows pin regardless of `fixed`.
- **Default** (`configurable-header.tsx`) wraps everything in `md:sticky md:top-0`,
  overriding the per-row `lg:sticky` hint in `header-row-renderer.tsx`.

Result: rows marked **Scroll** never scroll away.

## Desired behavior (true per-row islands)

- Non-fixed rows scroll away with the page.
- Each fixed row stays pinned at the top, stacked in order.
- A non-fixed row placed _between_ two fixed rows scrolls **under** the upper
  fixed row; the lower fixed row pins directly beneath the upper one.

## Mechanism

`position: sticky` only persists while the element's containing block (its parent)
is on screen. Rows currently live inside the short `<header>`, so per-row sticky
would un-stick almost immediately. Two changes fix that:

1. **Header wrapper → `display: contents`** (`contents` class) in both
   `time-header.tsx` and `configurable-header.tsx`. The `<header>` keeps its
   banner semantics but generates no box, so each row's containing block becomes
   the tall page column and sticky rows persist for the whole scroll.

   - The header box's background/elevation shadow is dropped (each row already
     paints its own background). The scroll-elevation shadow moves onto the
     bottom-most pinned (fixed) row.

2. **Per-row sticky with measured offsets.** Non-fixed rows stay `static`. Each
   fixed row gets `position: sticky; top: <sum of heights of fixed rows pinned
above it>; z-index: 100`. Row heights are dynamic (builder `height` optional),
   so the header component measures the fixed rows and feeds each its cumulative
   top offset.

3. **Shared hook** `useFixedRowOffsets(rows)` — returns `{ offsets, setRowRef }`.
   Uses a layout effect + `ResizeObserver` + window resize to recompute offsets.
   Only `enabled && fixed` rows accumulate height; disabled rows (renderer returns
   null) and hidden-on-mobile rows (height 0) contribute nothing.

## Files

- `src/hooks/use-fixed-row-offsets.ts` (new)
- `src/components/themes/time/layout/time-header.tsx`
- `src/components/themes/time/layout/time-header-row-renderer.tsx`
- `src/layouts/header/configurable-header.tsx`
- `src/layouts/header/header-row-renderer.tsx`

## Out of scope / known limitation

- Other themes (only time + default share this row model today).
- Horizontal stacking-context edge cases beyond top-offset stacking.
