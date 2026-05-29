# Single-level mega-menu optimization

**Date:** 2026-05-27
**Component:** `src/layouts/header/b2b-inline-category-menu.tsx`

## Problem

The inline mega-menu always renders a two-column drop panel: a left rail of the
macro's groups + a middle panel of the active group's leaves. When a macro's
groups have no children of their own (a single flat level, e.g. `CALZATURE` →
`CLASSIC`, `CLASSIC PLUS`, …), this produces:

- A vertical rail listing the groups, and
- An empty middle panel showing only a "Vedi tutto" link.

That wastes the panel's horizontal space. In addition, the per-group count badge
comes from `leafCount(g)`, which returns `1` for a childless group, so every row
shows a meaningless `1`.

## Goals

1. When a macro is "flat" (all its groups are childless), render the groups as a
   single responsive multi-column grid filling the panel — no left rail, no empty
   middle.
2. Stop rendering the count badge when it carries no information.

Out of scope: data/API changes, mobile navigation, the rail layout used for
macros that do have nested leaves.

## Design

Changes are confined to `b2b-inline-category-menu.tsx`.

### 1. Flat detection

```ts
const isFlat = groups.length > 0 && groups.every((g) => !g.children?.length);
```

`groups` is the open macro's `children`. If even one group has children, the
macro is not flat and the existing rail + leaves layout is used unchanged
(per-group empty cases there still fall back to "Vedi tutto").

### 2. Flat grid panel

When `isFlat`, the drop panel renders a single-column wrapper (`grid-cols-1`,
dropping the `md:grid-cols-[…]` rail/leaves split) containing:

- A header row: the macro name on the left; a "Vedi tutto ›" link to the macro's
  `hrefFor(openMacroNode)` plus the × close button on the right (reusing the
  existing close button markup). The "Vedi tutto" link is rendered only when
  `hrefFor` resolves to a real URL — when it returns `#` (no destination) the
  link is omitted. This guard is applied to all "Vedi tutto" links in the panel
  (flat header, rail header, and the no-leaves fallback, which then renders
  nothing).
- The groups rendered with the same responsive grid and link styling the leaves
  use today (`columns-2 gap-6 lg:columns-3 xl:columns-4`, `›` + label, links to
  `hrefFor(g)`). No thumbnails, no badge — consistent with leaf styling.

### 3. Count badge

In the rail layout, render the `leafCount(g)` badge only when `leafCount(g) > 1`.
Childless/single groups show no number. In flat mode there is no badge by
construction.

## Testing

The component's hover/measure/overflow logic is awkward to unit-test. Verify the
flat layout and badge change visually via the running dev server. Optionally
extract `isFlatMacro(groups)` as a pure helper and unit-test it.
