# Time-theme Catalogue Index — dynamic `/categorie` taxonomy index

**Date:** 2026-05-20
**Repo:** `vinc-b2b`
**Theme:** `time` (default theme unchanged)
**Status:** Approved (Approach A) — ready for implementation plan

---

## 1. Goal

For the **`time` theme**, the category route `/{lang}/categorie/[[...slug]]` should render a
**navigable catalogue index** — a left-rail table of contents + sectioned lists of leaf-category
links, with a client-side filter and scroll-spy — instead of today's per-group product carousels.
The index is **driven dynamically by the PIM category tree** (no hardcoded data), replacing the
static `CATALOGUE` array from the source catalogue-index reference mockup.

Applies at the **root** (`/categorie`, "all groups") and at **non-leaf group pages**
(`/categorie/<group>`, that group's subtree). **Leaf** categories are unchanged — they keep the
existing server-rendered, paginated SEO product grid (`CategorySeoProducts`).

## 2. Current state (verified)

- **Route:** `src/app/[lang]/categorie/[[...slug]]/page.tsx` loads the PIM category tree
  (`serverFetchPimCategories` → `transformPimCategoriesTree`), prefetches it into React Query
  (key `['pim-categories', channel]`), renders `<CategoryJsonLd>` + `<CategoryPage>` (client,
  hydrated), and — only when the node is a **leaf** (`isLeaf`) — also renders the server
  `<CategorySeoProducts>` grid. This leaf branch is independent of `CategoryPage`'s own output.
- **`CategoryPage`** (`src/components/category/category-page.tsx`, client) is **not theme-aware**.
  For root / group nodes it renders product **carousels** (`CategoryChildrenCarousel` /
  `CategoryLeafCarousel`) or `CategorySubcategoriesGrid`. Category is the one UI area with no
  themed variant (cf. `themes/time/{product,search,cart,account,layout,home}` but no `category`).
- **PIM node shape** (`MenuTreeNode`, from `transformPimCategoriesTree`): `{ id, slug, name, label,
path: string[], isGroup, children, category_menu_image (item_icon url), category_banner_image,
description, category_id }`. Source `PimCategoryNode` also carries `product_count` and
  `display_order`. The synthetic channel root is flattened, so **top-level `MenuTreeNode`s are the
  real macro groups**. **No `accent` color and no inline-SVG icon set exist** (the mockup hardcodes
  both).
- **Theme id:** `useThemeId()` (`src/contexts/tenant.context.tsx`) returns `tenant.b2bTheme`
  (default `'default'`). `TenantProvider` wraps the tree server-side, so the hook is SSR-safe and
  the `time` branch renders into the initial HTML (SEO preserved). `ThemedHomeBlock` is the
  established precedent for `useThemeId() === 'time'` branching.
- **Time tokens:** `time-variables.css` defines `--time-dark`, `--time-red`, `--time-gray-{50,100,
200,400,500,600,900}`, `--radius-card`, `--radius-btn`, `--radius-input`; brand via
  `--color-brand`; fonts via `--font-display` / `--font-body`. Time components use Tailwind +
  these tokens (not raw `<style>`), and `t('key', { defaultValue })` for copy.

## 3. Decisions

- **D1 — Approach A (client theme-branch).** In `CategoryPage`, when `useThemeId() === 'time'` **and**
  the current view is **root or a non-leaf group**, render the new `<TimeCatalogueIndex>` instead of
  the carousel/grid sections. Everything else in `CategoryPage` (default theme, leaf branch,
  not-found, loading) is untouched. The server `CategorySeoProducts` leaf grid is unaffected.
- **D2 — Scope:** root + non-leaf group pages, **`time` theme only**. Default theme `/categorie`
  is byte-for-byte unchanged.
- **D3 — Data source:** the already-hydrated tree from `usePimCategoriesQuery` (same key the route
  prefetches). **No new fetch.** A pure helper maps tree → view model.
- **D4 — Counts = leaf-category count** (recursive count of descendants with no children), matching
  the mockup's "X categorie". (`product_count` is available as an alternative if "X prodotti" is
  preferred later.)
- **D5 — Badge icon = `category_menu_image` (`item_icon`) image** when present; else a neutral
  fallback glyph. The mockup's hand-drawn SVG set is not reproduced.
- **D6 — Accent = deterministic palette** cycled by section index (PIM has no color field). Default
  palette below; trivially swappable for a single `--color-brand`.
- **D7 — Styling = Tailwind + time tokens + theme fonts.** No raw `<style>` block, no new Google
  Fonts. The mockup's CSS variables map onto time tokens (§6).
- **D8 — Interactivity is client-only and data-free:** search filters the in-memory model;
  scroll-spy uses `IntersectionObserver`. No API calls. The mockup's own `<header class="topbar">`
  is **dropped** (the time header/layout already provides nav + global search).

## 4. Data model & mapping

```ts
interface CatalogueLeaf { label: string; href: string }            // a clickable category link
interface CatalogueGroup { name: string | null; count: number; items: CatalogueLeaf[] }
interface CatalogueSection {
  id: string;            // node id → rail anchor `sec-${id}`
  label: string;
  href: string;          // /{lang}/categorie/{path}
  accent: string;        // palette[i % palette.length]
  iconUrl: string | null;
  subtitle: string;      // description (HTML-stripped) or ''
  count: number;         // leaf-descendant count
  groups: CatalogueGroup[];
}
interface CatalogueIndexModel {
  sections: CatalogueSection[];
  totalGroups: number;   // "Gruppi"
  totalLeaves: number;   // "Categorie"
}

buildCatalogueIndexModel(tree: MenuTreeNode[], current: MenuTreeNode | null, lang: string): CatalogueIndexModel
```

**Helpers:** `leafCount(node)` = recursive count of descendants with no children (a leaf counts as 1);
`href(node)` = `/${lang}/categorie/${node.path.join('/')}`; `isGroupNode(n)` = `n.children?.length > 0`.

**Section selection** (`baseChildren = current ? current.children : tree`):

1. `leafChildren = baseChildren.filter(n => !isGroupNode(n))`,
   `groupChildren = baseChildren.filter(isGroupNode)`.
2. If `leafChildren.length > 0`, prepend a **synthetic section** for the current level:
   `{ id: current?.id ?? 'root', label: current?.label ?? rootLabel, href, accent: palette[0], iconUrl: current?.category_menu_image ?? null, count: leafChildren.length, groups: [{ name: null, count, items: leafChildren→leaf }] }`.
3. For each `G` in `groupChildren`, push a **macro section** built by partitioning `G.children`:
   - direct leaves of `G` → one `{ name: null }` group;
   - each sub-group `S` of `G` → a `{ name: S.label, count: leafCount(S), items: S.children→leaf }` group.
   - `section.count = leafCount(G)`, `iconUrl = G.category_menu_image`, `subtitle =
stripHtml(G.description)`, `href = href(G)`, `accent = palette[sectionIndex % palette.length]`.

This caps the visual at the mockup's **3 levels** (macro → subgroup → item); deeper nesting is
reached by following the item links into `/categorie/<deeper>`. **Worked examples:**

- **Root, macro with all-leaf children** (e.g. "Valvolame e Raccorderia") → one section, one
  unnamed group listing the leaves. ✓ mockup `name:null` group.
- **Root, macro with sub-groups** (e.g. "Edilizia e Impiantistica" → Edilizia / Segnaletica /
  Derivati, each with leaves) → one section with 3 named subgroups. ✓ mockup.
- **Group page** `/categorie/edilizia-e-impiantistica` → `current` = that node; its 3 sub-groups
  become 3 macro sections, each listing its leaves.
- **Group page** for an all-leaf macro → one synthetic section titled by the group, listing its
  leaves.

**Totals:** `totalGroups = sections.length` (number of macro sections shown, "Gruppi");
`totalLeaves = sum of leafCount over baseChildren` ("Categorie").

**Default accent palette** (swappable): `['#1a4d8f','#0f766e','#0891b2','#c2410c','#0369a1',
'#b45309','#b91c1c','#7c3aed','#991b1b']`.

## 5. Component architecture

| File                                                                 | Kind             | Responsibility                                                                          |
| -------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/components/themes/time/category/build-catalogue-index-model.ts` | pure TS          | tree → `CatalogueIndexModel` (§4). Unit-tested in isolation.                            |
| `src/components/themes/time/category/time-catalogue-index.tsx`       | client component | Renders the index from the model. Props: `{ tree: MenuTreeNode[]; current: MenuTreeNode | null; lang: string }`. Owns search state + scroll-spy. |
| `src/components/category/category-page.tsx`                          | edit             | Add the `time` branch (D1).                                                             |

`TimeCatalogueIndex` internal structure (mockup parity, minus the topbar):

- **Substrip:** breadcrumb (`Home › <rootLabel|current.label>`), `<h1>` title, totals (Gruppi /
  Categorie).
- **Local filter:** a labelled search `<input>` (filters the model client-side; distinct from the
  header's global product search) with a clear button.
- **Desktop rail** (`sticky`): "Vai al gruppo" + one link per section (`#sec-${id}`, dot in the
  section accent, leaf count).
- **Mobile rail:** horizontal chip scroller of the same links.
- **Sections:** per section a head (icon badge in accent, `<h2>`, subtitle + count, "Tutto il
  gruppo" → `href`) and a body of groups; each group an optional `group-title` + a multi-column
  list of `a.leaf` links (`/categorie/<path>`).
- **Results meta + empty state** for active filters.

`category-page.tsx` branch (top of the render, after data load, before the existing JSX):

```tsx
const themeId = useThemeId();
const isLeaf =
  slug.length > 0 && !(current?.isGroup && (current.children?.length ?? 0) > 0);
if (themeId === 'time' && !isLeaf) {
  return <TimeCatalogueIndex tree={tree} current={current} lang={lang} />;
}
```

Leaf nodes (`isLeaf`) fall through unchanged — `CategoryPage` already renders nothing for the leaf
case when `disableLeafCarousel`, and the server `CategorySeoProducts` provides the grid.

## 6. Styling token map (mockup → time)

| mockup var                    | time token / value                                       |
| ----------------------------- | -------------------------------------------------------- |
| `--ink`                       | `--time-gray-900` / `--time-dark`                        |
| `--ink-2`                     | `--time-gray-600`                                        |
| `--ink-3`                     | `--time-gray-400` / `--time-gray-500`                    |
| `--line`                      | `--time-gray-200`                                        |
| `--line-2`                    | `--time-gray-100`                                        |
| `--paper`                     | `--time-gray-50`                                         |
| `--card`                      | `#fff`                                                   |
| `--brand`                     | `--color-brand`                                          |
| `--accent` (per section)      | inline `style={{ ['--accent' as any]: section.accent }}` |
| `--radius`                    | `--radius-card` / `--radius-btn`                         |
| headings / `h1` / `h2`        | `font-[family-name:var(--font-display)]`                 |
| body / labels                 | `font-[family-name:var(--font-body)]`                    |
| mono numerals (counts/totals) | `font-variant-numeric: tabular-nums`                     |

Sticky offsets: rail `top` and section `scroll-margin-top` account for the time header height so
in-page anchors land below it.

## 7. Behavior

- **Search:** controlled input → lower-cased query → `useMemo` filtered model: a leaf matches if its
  label includes the query; a group/section is shown only if it has ≥1 matching leaf; matched
  substrings are wrapped in `<mark>`. Empty query restores the full model. Show a results-count
  banner when filtering; show the empty state when zero matches.
- **Scroll-spy:** `IntersectionObserver` (created in `useEffect`, client-only) toggles the active
  rail link by visible section id (mockup's `rootMargin:'-30% 0px -60% 0px'`).
- **Links:** every leaf and "Tutto il gruppo" → `/{lang}/categorie/{path}`. Leaves resolve to the
  existing SSR product grid; intermediate groups recurse into another index level.
- **i18n:** `useTranslation(lang, 'common')` with inline `defaultValue` (existing pattern), e.g.
  `catalogue-index-title` ("Indice del catalogo" / "Catalogue index"), `catalogue-stat-groups`
  ("Gruppi" / "Groups"), `catalogue-stat-categories` ("Categorie" / "Categories"),
  `catalogue-view-all` ("Tutto il gruppo" / "View all"), `catalogue-search-placeholder`
  ("Cerca una categoria…" / "Search a category…"), `catalogue-rail-title` ("Vai al gruppo" /
  "Jump to group"), `catalogue-no-results-title` / `catalogue-no-results-body`.

## 8. Edge cases

- **Loading / empty tree:** mirror `CategoryPage` — render nothing while `isLoading`; if the tree is
  empty, render the empty state (no sections).
- **Missing icon:** fallback neutral glyph in the badge.
- **Single-level macro** (all-leaf children): one unnamed group; no `group-title`.
- **Deep trees (>3 levels):** flattened at the item level; deeper navigation via links.
- **a11y:** search input has a visible/`aria` label; sections use real `<h2>`; rail links are
  anchors; clear button has `aria-label`.
- **SSR:** component renders during SSR from hydrated data; `IntersectionObserver` is guarded inside
  `useEffect` so it never runs on the server.
- **Performance:** filter is O(n) over leaves per keystroke; fine for typical taxonomies. Add a small
  debounce only if a tenant tree proves large.

## 9. Testing (per `src/test/TESTING_STANDARDS.md`)

- **Unit — `build-catalogue-index-model`:** root vs group context; leaf/sub-group partition;
  synthetic section for direct leaves; `leafCount` correctness; `href` shape; accent cycling;
  totals; depth cap.
- **Component — `time-catalogue-index`:** renders sections/rail from a fixture tree; filter
  match/highlight/empty-state; leaves link to `/{lang}/categorie/<path>`; "Tutto il gruppo" href.
- **Branch — `category-page`:** `time` + non-leaf renders `TimeCatalogueIndex`; `time` + leaf and
  `default` theme do **not** (regression guard for the default experience).

## 10. Files

- **Add:** `src/components/themes/time/category/build-catalogue-index-model.ts`
- **Add:** `src/components/themes/time/category/time-catalogue-index.tsx`
- **Add:** `src/test/unit/build-catalogue-index-model.test.ts`
- **Add:** `src/test/components/time-catalogue-index.test.tsx`
- **Edit:** `src/components/category/category-page.tsx` (theme branch only)

## 11. Out of scope / open items

- Default theme `/categorie` redesign (untouched).
- Leaf product-listing pages (`CategorySeoProducts`) — unchanged.
- Persisting per-category accent colors/icons in PIM (future; today derived/`item_icon`).
- The local reference mockup HTML (untracked) is a design artifact only, not shipped.
