import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import { ROUTES } from '@utils/routes';

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
  return `/${lang}${ROUTES.CATEGORY}/${node.path.join('/')}`;
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
      // Items are sg's direct children — the catalogue renders at most 3 levels
      // (macro → sub-group → item). In trees deeper than that, an item may link
      // to a sub-group rather than a leaf; `count` still reflects total leaf
      // descendants, and deeper nesting is reached by following the link.
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
      href: current ? hrefFor(current, lang) : `/${lang}${ROUTES.CATEGORY}`,
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
