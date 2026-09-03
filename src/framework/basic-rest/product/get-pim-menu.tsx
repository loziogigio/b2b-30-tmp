import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import { get } from '@framework/utils/httpPIM';
import { slugify } from '@utils/slugify';
import type { PimMenuTreeItem, PimMenuResponse } from 'vinc-pim';

// Re-export for consumers that import from this file
export type { PimMenuTreeItem } from 'vinc-pim';

// ===============================
// Transform PIM menu to MenuTreeNode format (compatible with existing code)
// ===============================
export interface MenuTreeNode {
  id: string;
  slug: string;
  name: string;
  label: string;
  url: string | null;
  path: string[];
  isGroup: boolean;
  children: MenuTreeNode[];
  category_menu_image?: string | null;
  category_banner_image?: string | null;
  category_banner_image_mobile?: string | null;
  description?: string | null;
  /** When the node was produced from the PIM categories tree, this is the
   *  canonical PIM `category_id`. Lets leaf consumers filter products by
   *  `category_ancestors` instead of doing a slug-as-text search. */
  category_id?: string;
  /** ERP group code (e.g. "10010001"), retained for legacy integrations. */
  external_code?: string | null;
  /** Products assigned to this PIM category, when the tenant maintains counts. */
  product_count?: number;
}

function transformPimMenuItem(
  item: PimMenuTreeItem,
  parentPath: string[] = [],
): MenuTreeNode {
  // Use slugified version for URL-safe paths
  const rawSlug = item.reference_id || item.label || item.id;
  const slug = slugify(rawSlug);
  const currentPath = [...parentPath, slug];

  return {
    id: item.id,
    slug: slug,
    name: item.label,
    label: item.label,
    url: item.url || null,
    path: currentPath,
    isGroup: item.children.length > 0,
    children: item.children.map((child) =>
      transformPimMenuItem(child, currentPath),
    ),
    category_menu_image: item.icon || null,
    category_banner_image: item.image_url || null,
    category_banner_image_mobile: item.mobile_image_url || null,
    description: item.rich_text || null,
  };
}

export function transformPimMenuTree(items: PimMenuTreeItem[]): MenuTreeNode[] {
  return items.map((item) => transformPimMenuItem(item, []));
}

// ===============================
// Fetch function for PIM Menu via proxy (credentials injected server-side)
// ===============================
export const fetchPimMenu = async (
  location?: 'header' | 'footer' | 'mobile',
  channel?: string,
  lang?: string,
): Promise<{
  menuItems: MenuTreeNode[];
  flat: PimMenuTreeItem[];
}> => {
  const params: Record<string, string> = {};
  if (location) params.location = location;
  if (channel) params.channel = channel;
  if (lang) params.lang = lang;
  const data = await get<PimMenuResponse>(
    API_ENDPOINTS_PIM.MENU,
    Object.keys(params).length > 0 ? params : undefined,
  );

  if (!data.success) {
    throw new Error('PIM menu returned unsuccessful response');
  }

  return {
    menuItems: transformPimMenuTree(data.menuItems || []),
    flat: data.flat || [],
  };
};

// ===============================
// React Query hook for PIM Menu
// ===============================
export const usePimMenuQuery = (options?: {
  location?: 'header' | 'footer' | 'mobile';
  channel?: string;
  lang?: string;
  enabled?: boolean;
  staleTime?: number;
}) => {
  const enabled = options?.enabled ?? true;
  const location = options?.location;
  const channel = options?.channel;
  const lang = options?.lang;

  return useQuery({
    // lang is part of the key so switching language refetches translated labels.
    queryKey: ['pim-menu', location, channel ?? null, lang ?? null],
    queryFn: () => fetchPimMenu(location, channel, lang),
    enabled,
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes default
  });
};

// ===============================
// Helper to find node by path in tree
// ===============================
export function findNodeByPath(
  tree: MenuTreeNode[],
  pathSegments: string[],
): MenuTreeNode | null {
  if (!pathSegments.length) return null;

  let current: MenuTreeNode | undefined;
  let level = tree;

  for (const segment of pathSegments) {
    current = level.find((node) => node.slug === segment);
    if (!current) return null;
    level = current.children;
  }

  return current || null;
}

// ===============================
// Helper to find node by id (recursive search)
// ===============================
export function findNodeById(
  tree: MenuTreeNode[],
  id: string,
): MenuTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

// ===============================
// Pick the deepest matching node for a list of category ids
// ===============================
export function findDeepestNodeForCategoryIds(
  tree: MenuTreeNode[],
  categoryIds: string[],
): MenuTreeNode | null {
  let deepest: MenuTreeNode | null = null;
  for (const id of categoryIds) {
    const node = findNodeById(tree, id);
    if (node && (!deepest || node.path.length > deepest.path.length)) {
      deepest = node;
    }
  }
  return deepest;
}

// ===============================
// Build the path of nodes (root → leaf) for a node
// ===============================
export function buildNodeAncestry(
  tree: MenuTreeNode[],
  node: MenuTreeNode,
): MenuTreeNode[] {
  const result: MenuTreeNode[] = [];
  let level = tree;
  for (const slug of node.path) {
    const found = level.find((n) => n.slug === slug);
    if (!found) break;
    result.push(found);
    level = found.children;
  }
  return result;
}
