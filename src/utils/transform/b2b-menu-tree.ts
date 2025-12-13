// utils/transform/b2b-menu-tree.ts
import { CmsB2BMenuItem } from './b2b-cms-menu';

export type MenuTreeNode = {
  id: string;
  name: string;
  label: string;
  url?: string | null;
  isGroup: boolean;
  order?: number;
  lft?: number;
  description?: string | null;
  children: MenuTreeNode[];
  category_menu_image?: string | null;
  category_banner_image?: string | null;
  category_banner_image_mobile?: string | null;

  // NEW:
  slug: string; // e.g. "manutenzione-impianto"
  path: string[]; // e.g. ["trattamento-impianti","manutenzione-impianto"]
  code?: string | null; // parsed from node.url (?filters-category or ?category)
};

const rmAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const slugify = (s: string) =>
  rmAccents(s || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

const getCodeFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const q = url.includes('?') ? url.split('?')[1] : url;
    const sp = new URLSearchParams(q);
    return sp.get('filters-category') || sp.get('category');
  } catch {
    return null;
  }
};

function sortNodes(a: MenuTreeNode, b: MenuTreeNode) {
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  const al = a.lft ?? Number.MAX_SAFE_INTEGER;
  const bl = b.lft ?? Number.MAX_SAFE_INTEGER;
  if (al !== bl) return al - bl;
  return a.label.localeCompare(b.label, 'it');
}

export function buildB2BMenuTree(items: CmsB2BMenuItem[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>();

  // create nodes
  items.forEach((i) => {
    const uniqueId = `${i.name}-${i.lft ?? ''}-${i.parent_menu ?? ''}`;
    const base: MenuTreeNode = {
      id: uniqueId,
      name: i.name,
      description: i.description,
      category_menu_image: i.category_menu_image,
      category_banner_image: i.category_banner_image,
      category_banner_image_mobile: i.category_banner_image_mobile,
      label: i.label || i.title || i.name,
      url: i.url,
      isGroup: i.is_group === 1,
      order: i.order,
      lft: i.lft,
      children: [],
      slug: '', // set later
      path: [], // set later
      code: getCodeFromUrl(i.url),
    };
    map.set(uniqueId, base);
  });

  const roots: MenuTreeNode[] = [];

  // link parent/child
  items.forEach((i) => {
    const nodeId = `${i.name}-${i.lft ?? ''}-${i.parent_menu ?? ''}`;
    const node = map.get(nodeId)!;

    const parentItem = i.parent_menu
      ? items.find((p) => p.name === i.parent_menu)
      : undefined;

    if (parentItem) {
      const parentId = `${parentItem.name}-${parentItem.lft ?? ''}-${parentItem.parent_menu ?? ''}`;
      const parentNode = map.get(parentId);
      if (parentNode) parentNode.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  // assign slug + path; sort children
  const assign = (n: MenuTreeNode, parentPath: string[]) => {
    n.slug = slugify(n.name);
    n.path = [...parentPath, n.slug];
    n.children.sort(sortNodes);
    n.children.forEach((c) => assign(c, n.path));
  };
  roots.sort(sortNodes);
  roots.forEach((r) => assign(r, []));

  return roots;
}

/** DFS find by code, also returns the full path of nodes (chain) */
export function findNodeByCode(
  roots: MenuTreeNode[],
  code: string,
): { node: MenuTreeNode | null; chain: MenuTreeNode[] } {
  const stack = roots.map((n) => ({ n, chain: [n] }));
  while (stack.length) {
    const { n, chain } = stack.pop()!;
    if ((n.code && n.code === code) || n.id === code) return { node: n, chain };
    for (const c of n.children) stack.push({ n: c, chain: [...chain, c] });
  }
  return { node: null, chain: [] };
}

export function findNodeByPath(
  roots: MenuTreeNode[],
  slugPath: string[],
): MenuTreeNode | null {
  if (!slugPath.length) return null;
  let level = roots;
  let current: MenuTreeNode | null = null;

  for (const slug of slugPath) {
    const found = level.find((n) => n.slug === slug);
    if (!found) return null;
    current = found;
    level = found.children;
  }
  return current;
}
