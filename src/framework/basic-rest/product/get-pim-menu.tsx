import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS_PIM } from '@framework/utils/api-endpoints-pim';
import { get } from '@framework/utils/httpPIM';
import { slugify } from '@utils/slugify';

// ===============================
// Types for PIM Menu API response
// ===============================
export interface PimMenuTreeItem {
  id: string;
  type:
    | 'collection'
    | 'category'
    | 'brand'
    | 'tag'
    | 'product_type'
    | 'product'
    | 'page'
    | 'url'
    | 'search'
    | 'divider';
  label: string;
  reference_id?: string;
  url?: string;
  icon?: string;
  rich_text?: string;
  image_url?: string;
  mobile_image_url?: string;
  include_children: boolean;
  max_depth?: number;
  open_in_new_tab: boolean;
  css_class?: string;
  level: number;
  children: PimMenuTreeItem[];
}

interface PimMenuResponse {
  success: boolean;
  menuItems: PimMenuTreeItem[];
  flat: PimMenuTreeItem[];
}

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

function transformPimMenuTree(items: PimMenuTreeItem[]): MenuTreeNode[] {
  return items.map((item) => transformPimMenuItem(item, []));
}

// ===============================
// Fetch function for PIM Menu via proxy (credentials injected server-side)
// ===============================
export const fetchPimMenu = async (
  location?: 'header' | 'footer' | 'mobile',
): Promise<{
  menuItems: MenuTreeNode[];
  flat: PimMenuTreeItem[];
}> => {
  const params = location ? { location } : undefined;
  const data = await get<PimMenuResponse>(API_ENDPOINTS_PIM.MENU, params);

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
  enabled?: boolean;
  staleTime?: number;
}) => {
  const enabled = options?.enabled ?? true;
  const location = options?.location;

  return useQuery({
    queryKey: ['pim-menu', location],
    queryFn: () => fetchPimMenu(location),
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
