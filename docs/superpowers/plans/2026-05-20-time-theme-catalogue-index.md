# Time-theme Catalogue Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For the `time` theme, render `/{lang}/categorie` (root + non-leaf group pages) as a navigable catalogue index — a left-rail TOC + sectioned leaf-category links with a client-side filter and scroll-spy — driven dynamically by the PIM category tree.

**Architecture:** A pure helper (`buildCatalogueIndexModel`) maps the already-hydrated `MenuTreeNode[]` tree into a view model; a client component (`TimeCatalogueIndex`) renders it with Tailwind + `--time-*` tokens; `CategoryPage` gains a single `useThemeId() === 'time'` branch that renders the index for non-leaf nodes (leaves and the default theme are untouched). No new data fetching — the route already prefetches the tree into React Query.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-20-time-theme-catalogue-index-design.md`

---

## File Structure

| File                                                                 | Responsibility                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/components/themes/time/category/build-catalogue-index-model.ts` | Pure: types, accent palette, `leafCount`, `buildCatalogueIndexModel`. No React, no i18n.                                  |
| `src/components/themes/time/category/time-catalogue-index.tsx`       | Client component: substrip + totals, filter input, rail (desktop), sections, scroll-spy. Props `{ tree, current, lang }`. |
| `src/components/category/category-page.tsx`                          | **Edit only:** add `useThemeId` hook + a branch returning `<TimeCatalogueIndex>` for time theme on non-leaf nodes.        |
| `src/test/unit/build-catalogue-index-model.test.ts`                  | Unit tests for the model.                                                                                                 |
| `src/test/components/time-catalogue-index.test.tsx`                  | Component tests (render, links, filter, empty state).                                                                     |
| `src/test/components/category-page-theme-branch.test.tsx`            | Branch tests (time root/group → index; time leaf + default → not).                                                        |

**Note on signature:** the spec sketched `buildCatalogueIndexModel(tree, current, lang)`. This plan uses a 4th `rootLabel: string` arg so the helper stays pure (i18n label is supplied by the component, not hardcoded inside the helper). Intentional refinement.

**Note on commits:** a husky pre-commit hook runs `prettier --check .` across the repo and currently fails on an unrelated untracked file (`hidros-catalogue-index.html`). Per CLAUDE.md, commit with `--no-verify` (we run Prettier on our own files first, and run tests manually). CLAUDE.md also forbids `Co-Authored-By:` / `Generated with` lines in commit messages.

---

## Task 1: Catalogue index model (pure helper)

**Files:**

- Create: `src/components/themes/time/category/build-catalogue-index-model.ts`
- Test: `src/test/unit/build-catalogue-index-model.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/test/unit/build-catalogue-index-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildCatalogueIndexModel,
  leafCount,
  CATALOGUE_ACCENT_PALETTE,
} from '@components/themes/time/category/build-catalogue-index-model';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    isGroup: (p.children?.length ?? 0) > 0,
    children: [],
    ...p,
  } as MenuTreeNode;
}

// macroA: all-leaf children (2 leaves)
const macroA = node({
  id: 'a',
  slug: 'valvolame',
  label: 'Valvolame',
  path: ['valvolame'],
  description: '<p>Valvole e raccordi</p>',
  children: [
    node({
      id: 'a1',
      slug: 'valvole',
      label: 'Valvole',
      path: ['valvolame', 'valvole'],
    }),
    node({
      id: 'a2',
      slug: 'raccordi',
      label: 'Raccordi',
      path: ['valvolame', 'raccordi'],
    }),
  ],
});

// macroB: 1 direct leaf + 1 sub-group (with 2 leaves)
const macroB = node({
  id: 'b',
  slug: 'edilizia',
  label: 'Edilizia',
  path: ['edilizia'],
  children: [
    node({
      id: 'b0',
      slug: 'generale',
      label: 'Generale',
      path: ['edilizia', 'generale'],
    }),
    node({
      id: 'bg',
      slug: 'segnaletica',
      label: 'Segnaletica',
      path: ['edilizia', 'segnaletica'],
      children: [
        node({
          id: 'bg1',
          slug: 'cartelli',
          label: 'Cartelli',
          path: ['edilizia', 'segnaletica', 'cartelli'],
        }),
        node({
          id: 'bg2',
          slug: 'guanti',
          label: 'Guanti',
          path: ['edilizia', 'segnaletica', 'guanti'],
        }),
      ],
    }),
  ],
});

const tree: MenuTreeNode[] = [macroA, macroB];

describe('unit: leafCount', () => {
  it('counts a leaf as 1', () => {
    expect(leafCount(node({ id: 'x', slug: 'x', path: ['x'] }))).toBe(1);
  });
  it('counts leaf descendants recursively', () => {
    expect(leafCount(macroB)).toBe(3); // generale + cartelli + guanti
  });
});

describe('unit: buildCatalogueIndexModel (root)', () => {
  const model = buildCatalogueIndexModel(tree, null, 'it', 'Tutti i gruppi');

  it('creates one section per top-level group', () => {
    expect(model.sections.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('renders an all-leaf macro as a single unnamed group', () => {
    const a = model.sections[0];
    expect(a.groups).toHaveLength(1);
    expect(a.groups[0].name).toBeNull();
    expect(a.groups[0].items.map((i) => i.label)).toEqual([
      'Valvole',
      'Raccordi',
    ]);
  });

  it('links leaves to the category route', () => {
    expect(model.sections[0].groups[0].items[0].href).toBe(
      '/it/categorie/valvolame/valvole',
    );
  });

  it('partitions direct leaves and sub-groups within a macro', () => {
    const b = model.sections[1];
    expect(b.groups[0].name).toBeNull();
    expect(b.groups[0].items.map((i) => i.label)).toEqual(['Generale']);
    expect(b.groups[1].name).toBe('Segnaletica');
    expect(b.groups[1].count).toBe(2);
    expect(b.groups[1].items.map((i) => i.label)).toEqual([
      'Cartelli',
      'Guanti',
    ]);
  });

  it('computes leaf counts and totals', () => {
    expect(model.sections[0].count).toBe(2);
    expect(model.sections[1].count).toBe(3);
    expect(model.totalGroups).toBe(2);
    expect(model.totalLeaves).toBe(5);
  });

  it('strips HTML from the subtitle', () => {
    expect(model.sections[0].subtitle).toBe('Valvole e raccordi');
  });

  it('cycles the accent palette by section index', () => {
    expect(model.sections[0].accent).toBe(CATALOGUE_ACCENT_PALETTE[0]);
    expect(model.sections[1].accent).toBe(CATALOGUE_ACCENT_PALETTE[1]);
  });
});

describe('unit: buildCatalogueIndexModel (group page)', () => {
  it('uses the current node sub-groups as sections', () => {
    const model = buildCatalogueIndexModel(
      tree,
      macroB,
      'it',
      'Tutti i gruppi',
    );
    expect(model.sections[0].id).toBe('b'); // synthetic, current node id
    expect(model.sections[0].groups[0].items.map((i) => i.label)).toEqual([
      'Generale',
    ]);
    expect(model.sections[1].id).toBe('bg');
    expect(model.sections[1].label).toBe('Segnaletica');
    expect(model.sections[1].groups[0].items.map((i) => i.label)).toEqual([
      'Cartelli',
      'Guanti',
    ]);
  });

  it('uses rootLabel for a synthetic root section when tree has direct leaves', () => {
    const flat: MenuTreeNode[] = [
      node({ id: 'l', slug: 'solo', label: 'Solo', path: ['solo'] }),
    ];
    const model = buildCatalogueIndexModel(flat, null, 'it', 'Tutti i gruppi');
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0].label).toBe('Tutti i gruppi');
    expect(model.sections[0].groups[0].items[0].href).toBe(
      '/it/categorie/solo',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test build-catalogue-index-model`
Expected: FAIL — cannot resolve `@components/themes/time/category/build-catalogue-index-model` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/themes/time/category/build-catalogue-index-model.ts`:

```ts
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

export interface CatalogueLeaf {
  label: string;
  href: string;
}

export interface CatalogueGroup {
  /** Sub-group heading; `null` = direct leaves shown without a heading. */
  name: string | null;
  count: number;
  items: CatalogueLeaf[];
}

export interface CatalogueSection {
  id: string;
  label: string;
  href: string;
  accent: string;
  iconUrl: string | null;
  subtitle: string;
  count: number;
  groups: CatalogueGroup[];
}

export interface CatalogueIndexModel {
  sections: CatalogueSection[];
  totalGroups: number;
  totalLeaves: number;
}

/** On-brand accents cycled across top-level sections (PIM has no color field). */
export const CATALOGUE_ACCENT_PALETTE = [
  '#1a4d8f',
  '#0f766e',
  '#0891b2',
  '#c2410c',
  '#0369a1',
  '#b45309',
  '#b91c1c',
  '#7c3aed',
  '#991b1b',
] as const;

const isGroupNode = (n: MenuTreeNode): boolean => (n.children?.length ?? 0) > 0;

/** Recursive count of leaf descendants (a childless node counts as 1). */
export function leafCount(node: MenuTreeNode): number {
  if (!isGroupNode(node)) return 1;
  return node.children.reduce((sum, child) => sum + leafCount(child), 0);
}

function hrefFor(node: MenuTreeNode, lang: string): string {
  return `/${lang}/categorie/${node.path.map(encodeURIComponent).join('/')}`;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLeaf(node: MenuTreeNode, lang: string): CatalogueLeaf {
  return { label: node.label || node.name, href: hrefFor(node, lang) };
}

/** Body groups of a macro section: direct leaves (unnamed) + each sub-group. */
function buildGroups(
  sectionNode: MenuTreeNode,
  lang: string,
): CatalogueGroup[] {
  const children = sectionNode.children ?? [];
  const directLeaves = children.filter((c) => !isGroupNode(c));
  const subGroups = children.filter(isGroupNode);

  const groups: CatalogueGroup[] = [];
  if (directLeaves.length) {
    groups.push({
      name: null,
      count: directLeaves.length,
      items: directLeaves.map((l) => toLeaf(l, lang)),
    });
  }
  for (const sg of subGroups) {
    groups.push({
      name: sg.label || sg.name,
      count: leafCount(sg),
      items: (sg.children ?? []).map((c) => toLeaf(c, lang)),
    });
  }
  return groups;
}

export function buildCatalogueIndexModel(
  tree: MenuTreeNode[],
  current: MenuTreeNode | null,
  lang: string,
  rootLabel: string,
): CatalogueIndexModel {
  const baseChildren = current ? (current.children ?? []) : tree;
  const leafChildren = baseChildren.filter((n) => !isGroupNode(n));
  const groupChildren = baseChildren.filter(isGroupNode);

  const sections: CatalogueSection[] = [];

  // Direct leaves at this level → one synthetic section.
  if (leafChildren.length) {
    sections.push({
      id: current?.id ?? 'root',
      label: current?.label || current?.name || rootLabel,
      href: current ? hrefFor(current, lang) : `/${lang}/categorie`,
      accent: CATALOGUE_ACCENT_PALETTE[0],
      iconUrl: current?.category_menu_image ?? null,
      subtitle: stripHtml(current?.description),
      count: leafChildren.length,
      groups: [
        {
          name: null,
          count: leafChildren.length,
          items: leafChildren.map((l) => toLeaf(l, lang)),
        },
      ],
    });
  }

  // Each group child → a macro section.
  for (const g of groupChildren) {
    const index = sections.length;
    sections.push({
      id: g.id,
      label: g.label || g.name,
      href: hrefFor(g, lang),
      accent: CATALOGUE_ACCENT_PALETTE[index % CATALOGUE_ACCENT_PALETTE.length],
      iconUrl: g.category_menu_image ?? null,
      subtitle: stripHtml(g.description),
      count: leafCount(g),
      groups: buildGroups(g, lang),
    });
  }

  const totalLeaves = baseChildren.reduce((sum, n) => sum + leafCount(n), 0);
  return { sections, totalGroups: sections.length, totalLeaves };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test build-catalogue-index-model`
Expected: PASS (all `describe` blocks green).

- [ ] **Step 5: Format and commit**

```bash
pnpm exec prettier --write \
  src/components/themes/time/category/build-catalogue-index-model.ts \
  src/test/unit/build-catalogue-index-model.test.ts
git add \
  src/components/themes/time/category/build-catalogue-index-model.ts \
  src/test/unit/build-catalogue-index-model.test.ts
git commit --no-verify -m "feat(time): catalogue index model for dynamic /categorie"
```

---

## Task 2: TimeCatalogueIndex component

**Files:**

- Create: `src/components/themes/time/category/time-catalogue-index.tsx`
- Test: `src/test/components/time-catalogue-index.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/test/components/time-catalogue-index.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}));

vi.mock('@components/ui/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={typeof href === 'string' ? href : '#'} className={className}>
      {children}
    </a>
  ),
}));

import TimeCatalogueIndex from '@components/themes/time/category/time-catalogue-index';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

beforeEach(() => {
  // jsdom has no IntersectionObserver
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    isGroup: (p.children?.length ?? 0) > 0,
    children: [],
    ...p,
  } as MenuTreeNode;
}

const tree: MenuTreeNode[] = [
  node({
    id: 'g1',
    slug: 'g1',
    label: 'Group One',
    path: ['g1'],
    children: [
      node({
        id: 'l1',
        slug: 'valvole',
        label: 'Valvole',
        path: ['g1', 'valvole'],
      }),
      node({
        id: 'l2',
        slug: 'raccordi',
        label: 'Raccordi',
        path: ['g1', 'raccordi'],
      }),
      node({
        id: 'sg1',
        slug: 'edilizia',
        label: 'Edilizia',
        path: ['g1', 'edilizia'],
        children: [
          node({
            id: 'l3',
            slug: 'cazzuole',
            label: 'Cazzuole',
            path: ['g1', 'edilizia', 'cazzuole'],
          }),
        ],
      }),
    ],
  }),
];

describe('TimeCatalogueIndex', () => {
  it('renders a section heading and leaf links pointing at the category route', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(
      screen.getByRole('heading', { name: 'Group One' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Valvole/ })).toHaveAttribute(
      'href',
      '/it/categorie/g1/valvole',
    );
  });

  it('renders the sub-group heading and its nested leaf', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(screen.getByText('Edilizia')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cazzuole/ })).toHaveAttribute(
      'href',
      '/it/categorie/g1/edilizia/cazzuole',
    );
  });

  it('links "view all" to the group page', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    expect(
      screen.getByRole('link', { name: 'Tutto il gruppo' }),
    ).toHaveAttribute('href', '/it/categorie/g1');
  });

  it('filters leaves by the search query', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    fireEvent.change(screen.getByLabelText('Cerca una categoria…'), {
      target: { value: 'valv' },
    });
    expect(screen.getByRole('link', { name: /Valvole/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Raccordi/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Cazzuole/ })).toBeNull();
  });

  it('shows the empty state when nothing matches', () => {
    render(<TimeCatalogueIndex tree={tree} current={null} lang="it" />);
    fireEvent.change(screen.getByLabelText('Cerca una categoria…'), {
      target: { value: 'zzzzz' },
    });
    expect(screen.getByText('Nessuna categoria trovata')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test time-catalogue-index`
Expected: FAIL — cannot resolve `@components/themes/time/category/time-catalogue-index`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/themes/time/category/time-catalogue-index.tsx`:

```tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@components/ui/link';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import {
  buildCatalogueIndexModel,
  type CatalogueIndexModel,
  type CatalogueSection,
} from './build-catalogue-index-model';

/** Wrap query matches in <mark> for the filter. */
function Highlight({ text, q }: { text: string; q: string }) {
  const needle = q.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let key = 0;
  let idx = lower.indexOf(needle, from);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded-[3px] bg-yellow-200 px-px text-inherit"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

function filterSections(
  model: CatalogueIndexModel,
  q: string,
): { sections: CatalogueSection[]; matchCount: number | null } {
  const query = q.trim().toLowerCase();
  if (!query) return { sections: model.sections, matchCount: null };
  let matchCount = 0;
  const sections = model.sections
    .map((s) => {
      const groups = s.groups
        .map((g) => {
          const items = g.items.filter((it) =>
            it.label.toLowerCase().includes(query),
          );
          matchCount += items.length;
          return { ...g, items };
        })
        .filter((g) => g.items.length > 0);
      return { ...s, groups };
    })
    .filter((s) => s.groups.length > 0);
  return { sections, matchCount };
}

export default function TimeCatalogueIndex({
  tree,
  current,
  lang,
}: {
  tree: MenuTreeNode[];
  current: MenuTreeNode | null;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'common');
  const rootLabel = t('all-categories', {
    defaultValue: lang === 'it' ? 'Tutti i gruppi' : 'All Groups',
  });

  const model = useMemo(
    () => buildCatalogueIndexModel(tree, current, lang, rootLabel),
    [tree, current, lang, rootLabel],
  );

  const [query, setQuery] = useState('');
  const { sections, matchCount } = useMemo(
    () => filterSections(model, query),
    [model, query],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !mainRef.current) return;
    const els =
      mainRef.current.querySelectorAll<HTMLElement>('[data-cat-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.id;
            if (id) setActiveId(id);
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const searchLabel = t('catalogue-search-placeholder', {
    defaultValue: lang === 'it' ? 'Cerca una categoria…' : 'Search a category…',
  });
  const title = t('catalogue-index-title', {
    defaultValue: lang === 'it' ? 'Indice del catalogo' : 'Catalogue index',
  });
  const subtitle = current
    ? current.label || current.name
    : t('catalogue-index-subtitle', {
        defaultValue:
          lang === 'it'
            ? 'Tutti i gruppi e le categorie merceologiche.'
            : 'All product groups and categories.',
      });
  const hasQuery = query.trim().length > 0;

  return (
    <div className="bg-[var(--time-gray-50)] font-[family-name:var(--font-body)] text-[var(--time-gray-900)]">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 lg:px-7">
        {/* Substrip */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-extrabold tracking-tight md:text-[30px]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--time-gray-500)]">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-7">
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-none tabular-nums text-[var(--color-brand)]">
                {model.totalGroups}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--time-gray-500)]">
                {t('catalogue-stat-groups', {
                  defaultValue: lang === 'it' ? 'Gruppi' : 'Groups',
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-none tabular-nums text-[var(--color-brand)]">
                {model.totalLeaves}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--time-gray-500)]">
                {t('catalogue-stat-categories', {
                  defaultValue: lang === 'it' ? 'Categorie' : 'Categories',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="relative mb-6 max-w-[520px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={searchLabel}
            placeholder={searchLabel}
            className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--time-gray-200)] bg-white px-4 text-[15px] outline-none focus:border-[var(--color-brand)]"
          />
          {hasQuery && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--time-gray-500)]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[260px_1fr]">
          {/* Rail (desktop) */}
          <nav className="sticky top-[88px] hidden max-h-[calc(100vh-110px)] overflow-auto rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white p-2.5 lg:block">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--time-gray-400)]">
              {t('catalogue-rail-title', {
                defaultValue: lang === 'it' ? 'Vai al gruppo' : 'Jump to group',
              })}
            </div>
            {model.sections.map((s) => (
              <a
                key={s.id}
                href={`#sec-${s.id}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  activeId === s.id
                    ? 'bg-[var(--time-gray-50)] text-[var(--time-gray-900)]'
                    : 'text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 flex-none rounded-[3px]"
                  style={{ background: s.accent }}
                />
                <span className="flex-1 leading-tight">{s.label}</span>
                <span className="text-[11px] tabular-nums text-[var(--time-gray-400)]">
                  {s.count}
                </span>
              </a>
            ))}
          </nav>

          {/* Main */}
          <main ref={mainRef} className="min-w-0">
            {hasQuery && matchCount != null && matchCount > 0 && (
              <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white px-4 py-3 text-sm font-semibold text-[var(--time-gray-600)]">
                {matchCount}{' '}
                {lang === 'it' ? 'categorie trovate' : 'categories found'}
              </div>
            )}

            {sections.length === 0 ? (
              <div className="py-16 text-center text-[var(--time-gray-500)]">
                <div className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--time-gray-900)]">
                  {t('catalogue-no-results-title', {
                    defaultValue:
                      lang === 'it'
                        ? 'Nessuna categoria trovata'
                        : 'No categories found',
                  })}
                </div>
                <div className="mt-1 text-sm">
                  {t('catalogue-no-results-body', {
                    defaultValue:
                      lang === 'it'
                        ? 'Prova con un termine diverso.'
                        : 'Try a different term.',
                  })}
                </div>
              </div>
            ) : (
              sections.map((s) => (
                <section
                  key={s.id}
                  id={`sec-${s.id}`}
                  data-cat-section
                  data-id={s.id}
                  style={{ ['--accent' as string]: s.accent }}
                  className="mb-4 scroll-mt-[88px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white"
                >
                  <div className="flex items-center gap-4 border-b border-l-4 border-[var(--time-gray-100)] border-l-[var(--accent)] px-5 py-4">
                    <span
                      className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-[10px] text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {s.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.iconUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold">
                          {(s.label || '?').charAt(0)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold uppercase tracking-tight text-[var(--time-gray-900)]">
                        {s.label}
                      </h2>
                      {s.subtitle && (
                        <div className="mt-0.5 truncate text-xs text-[var(--time-gray-500)]">
                          {s.subtitle}
                        </div>
                      )}
                    </div>
                    <Link
                      href={s.href}
                      className="flex-none rounded-full border border-[var(--time-gray-200)] px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                    >
                      {t('catalogue-view-all', {
                        defaultValue:
                          lang === 'it' ? 'Tutto il gruppo' : 'View all',
                      })}
                    </Link>
                  </div>

                  <div className="px-5 pb-4 pt-1">
                    {s.groups.map((g, gi) => (
                      <div
                        key={gi}
                        className={
                          gi > 0
                            ? 'mt-2 border-t border-dashed border-[var(--time-gray-100)] pt-3'
                            : 'pt-3'
                        }
                      >
                        {g.name && (
                          <div className="mb-2.5 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-wide text-[var(--accent)]">
                            <span>{g.name}</span>
                            <span className="text-[11px] tabular-nums text-[var(--time-gray-400)]">
                              {g.count}
                            </span>
                            <span className="h-px flex-1 bg-[var(--time-gray-100)]" />
                          </div>
                        )}
                        <div className="columns-1 gap-7 sm:columns-2 lg:columns-3 xl:columns-4">
                          {g.items.map((it, ii) => (
                            <Link
                              key={ii}
                              href={it.href}
                              className="flex break-inside-avoid items-baseline gap-2 rounded-md py-1.5 pl-0.5 pr-1.5 text-[13.5px] text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)] hover:text-[var(--accent)]"
                            >
                              <span className="flex-none font-bold text-[var(--accent)]">
                                ›
                              </span>
                              <span>
                                <Highlight text={it.label} q={query} />
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test time-catalogue-index`
Expected: PASS (5 tests green).

- [ ] **Step 5: Format and commit**

```bash
pnpm exec prettier --write \
  src/components/themes/time/category/time-catalogue-index.tsx \
  src/test/components/time-catalogue-index.test.tsx
git add \
  src/components/themes/time/category/time-catalogue-index.tsx \
  src/test/components/time-catalogue-index.test.tsx
git commit --no-verify -m "feat(time): TimeCatalogueIndex component"
```

---

## Task 3: CategoryPage theme branch

**Files:**

- Modify: `src/components/category/category-page.tsx`
- Test: `src/test/components/category-page-theme-branch.test.tsx`

- [ ] **Step 1: Write the failing branch test**

Create `src/test/components/category-page-theme-branch.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const useThemeIdMock = vi.fn();
vi.mock('@/contexts/tenant.context', () => ({
  useThemeId: () => useThemeIdMock(),
}));

vi.mock('@components/themes/time/category/time-catalogue-index', () => ({
  default: () => <div data-testid="time-catalogue-index" />,
}));

const usePimCategoriesQueryMock = vi.fn();
vi.mock('@framework/product/get-pim-categories', () => ({
  usePimCategoriesQuery: () => usePimCategoriesQueryMock(),
}));

vi.mock('@/hooks/use-home-settings', () => ({
  useHomeSettings: () => ({ settings: {} }),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));

vi.mock('@framework/product/get-pim-product', () => ({
  usePimProductListQuery: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('@components/category/category-children-carousel', () => ({
  default: () => <div data-testid="children-carousel" />,
}));
vi.mock('@components/category/category-subcategories-grid', () => ({
  default: () => <div data-testid="subcategories-grid" />,
}));
vi.mock('@components/product/products-carousel', () => ({
  default: () => <div data-testid="products-carousel" />,
}));
vi.mock('@components/cards/banner-card', () => ({
  default: () => <div data-testid="banner-card" />,
}));
vi.mock('@components/ui/category-breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb" />,
}));
vi.mock('@components/ui/container', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

import CategoryPage from '@components/category/category-page';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

function node(
  p: Partial<MenuTreeNode> & { id: string; slug: string; path: string[] },
): MenuTreeNode {
  return {
    name: p.slug,
    label: p.slug,
    url: null,
    isGroup: (p.children?.length ?? 0) > 0,
    children: [],
    ...p,
  } as MenuTreeNode;
}

const tree: MenuTreeNode[] = [
  node({
    id: 'g1',
    slug: 'g1',
    path: ['g1'],
    children: [node({ id: 'l1', slug: 'l1', path: ['g1', 'l1'] })],
  }),
];

beforeEach(() => {
  usePimCategoriesQueryMock.mockReturnValue({
    data: { menuItems: tree, flat: [] },
    isLoading: false,
    isError: false,
  });
});

describe('CategoryPage theme branch', () => {
  it('renders TimeCatalogueIndex for the time theme at the root', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={[]} />);
    expect(screen.getByTestId('time-catalogue-index')).toBeInTheDocument();
  });

  it('renders TimeCatalogueIndex for the time theme on a non-leaf group page', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={['g1']} />);
    expect(screen.getByTestId('time-catalogue-index')).toBeInTheDocument();
  });

  it('does NOT render TimeCatalogueIndex for the time theme on a leaf page', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<CategoryPage lang="it" slug={['g1', 'l1']} />);
    expect(screen.queryByTestId('time-catalogue-index')).toBeNull();
  });

  it('does NOT render TimeCatalogueIndex for the default theme', () => {
    useThemeIdMock.mockReturnValue('default');
    render(<CategoryPage lang="it" slug={[]} />);
    expect(screen.queryByTestId('time-catalogue-index')).toBeNull();
    expect(screen.getByTestId('children-carousel')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test category-page-theme-branch`
Expected: FAIL — `time-catalogue-index` is never rendered (branch not implemented), so the first test fails to find the testid.

- [ ] **Step 3a: Add imports to `category-page.tsx`**

In `src/components/category/category-page.tsx`, after the existing import block (the import of `extractSearchText` from `@/lib/category-search-text` is the last import), add:

```tsx
import { useThemeId } from '@/contexts/tenant.context';
import TimeCatalogueIndex from '@components/themes/time/category/time-catalogue-index';
```

- [ ] **Step 3b: Call the `useThemeId` hook with the other hooks**

In the `CategoryPage` component body, immediately after `const { t } = useTranslation(lang, 'common');`, add:

```tsx
const themeId = useThemeId();
```

(Hooks must run unconditionally — keep this with the other hooks, before any early `return`.)

- [ ] **Step 3c: Add the theme branch before the main return**

In `category-page.tsx`, the render currently reaches a final `return (` after the not-found guard (`if (slug.length && !current && tree.length > 0) { ... }`). Immediately **before** that final `return (`, insert:

```tsx
// Time theme renders root + non-leaf group pages as the catalogue index.
// Leaf nodes fall through to the existing SSR product grid.
const isLeaf =
  slug.length > 0 && !(current?.isGroup && (current.children?.length ?? 0) > 0);
if (themeId === 'time' && !isLeaf) {
  return <TimeCatalogueIndex tree={tree} current={current} lang={lang} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test category-page-theme-branch`
Expected: PASS (4 tests green).

- [ ] **Step 5: Run the full new-file test trio + format + commit**

```bash
pnpm test build-catalogue-index-model time-catalogue-index category-page-theme-branch
```

Expected: all PASS.

```bash
pnpm exec prettier --write \
  src/components/category/category-page.tsx \
  src/test/components/category-page-theme-branch.test.tsx
git add \
  src/components/category/category-page.tsx \
  src/test/components/category-page-theme-branch.test.tsx
git commit --no-verify -m "feat(time): render catalogue index on /categorie for time theme"
```

---

## Manual verification (after Task 3)

The user runs the dev server (builds are never run by the agent). To eyeball it:

1. `pnpm dev`
2. Open a `time`-theme tenant at `/it/categorie` → expect the rail + sectioned catalogue index.
3. Open a non-leaf group, e.g. `/it/categorie/<group>` → expect that group's subtree as the index.
4. Open a leaf category → expect the existing product grid (unchanged).
5. Type in the filter → expect matches to highlight and non-matches to hide; clear → full index returns.
6. Open a `default`-theme tenant `/it/categorie` → expect the original carousels (unchanged).

## Self-review (done before saving)

- **Spec coverage:** D1 (Task 3), D2/time-only + default-unchanged (Task 3 tests), D3 no-fetch/hydrated tree (props), D4 leaf counts (`leafCount`), D5 icon+fallback (component badge), D6 accent palette (`CATALOGUE_ACCENT_PALETTE`), D7 token styling (component), D8 client filter + scroll-spy + dropped topbar (component), §4 mapping (model + unit tests), §7 i18n keys (component defaults), §9 tests (all three files). No gaps.
- **Placeholders:** none — every step has full code/commands/expected output.
- **Type consistency:** `buildCatalogueIndexModel(tree, current, lang, rootLabel)`, `leafCount`, `CATALOGUE_ACCENT_PALETTE`, and the `CatalogueSection/Group/Leaf/IndexModel` types are defined in Task 1 and used identically in Tasks 2–3 and all tests.
