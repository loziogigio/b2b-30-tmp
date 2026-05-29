import { useQuery } from '@tanstack/react-query';
import { get } from '@framework/utils/httpPIM';
import { slugify } from '@utils/slugify';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';

// ===============================
// PIM Category types
// Returned by GET /api/public/categories on the commerce-suite PIM.
// ===============================
export interface PimCategoryImage {
  url: string;
  alt_text?: string;
  cdn_key?: string;
}

export interface PimCategoryNode {
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  /** ERP group code (e.g. "10010001") exposed by the public categories root. */
  external_code?: string | null;
  parent_id?: string | null;
  level: number;
  path: string[];
  /** Small square thumbnail shown on category cards / menu rows. */
  item_icon?: PimCategoryImage | null;
  /** Wide banner shown at the top of a category page. */
  hero_image?: PimCategoryImage | null;
  mobile_hero_image?: PimCategoryImage | null;
  display_order: number;
  channel_code?: string | null;
  product_count: number;
  children: PimCategoryNode[];
}

export interface PimCategoriesResponse {
  success: boolean;
  categories: PimCategoryNode[];
  flat?: PimCategoryNode[];
}

// ===============================
// Transform PIM category tree -> MenuTreeNode
// Produces the same shape the existing category UI already renders, so the
// page/components keep working unchanged.
// ===============================
function transformPimCategoryNode(
  node: PimCategoryNode,
  parentPath: string[] = [],
): MenuTreeNode {
  const rawSlug = node.slug || node.name || node.category_id;
  const slug = slugify(rawSlug);
  const currentPath = [...parentPath, slug];
  const children = (node.children || []).map((child) =>
    transformPimCategoryNode(child, currentPath),
  );

  return {
    id: node.category_id,
    slug,
    name: node.name,
    label: node.name,
    // Categories don't carry CMS-authored URLs; let the renderer build paths
    // from `path` so navigation lands on `/categorie/<slug>` (the dedicated
    // category route) instead of a synthetic search URL.
    url: null,
    path: currentPath,
    isGroup: children.length > 0,
    children,
    // Cards/menu rows prefer the dedicated `item_icon`; fall back to the
    // hero banner so categories without a square icon still get *something*.
    category_menu_image: node.item_icon?.url || node.hero_image?.url || null,
    category_banner_image: node.hero_image?.url || null,
    category_banner_image_mobile:
      node.mobile_hero_image?.url || node.hero_image?.url || null,
    description: node.description || null,
    category_id: node.category_id,
    external_code: node.external_code ?? null,
  };
}

export function transformPimCategoriesTree(
  items: PimCategoryNode[],
): MenuTreeNode[] {
  // PIM tenants typically have a single synthetic root per channel (e.g.
  // "categorie" for the b2b channel on Italian tenants). The route base is
  // already `/[lang]/categorie`, so flattening that root keeps URLs to one
  // "categorie" segment — `/it/categorie/<slug>` instead of
  // `/it/categorie/categorie/<slug>`. Roots with no children fall back to
  // appearing at the top level themselves.
  return items.flatMap((root) => {
    const kids = root.children || [];
    if (kids.length === 0) return [transformPimCategoryNode(root, [])];
    return kids.map((child) => transformPimCategoryNode(child, []));
  });
}

// ===============================
// Fetch via the b2b PIM proxy (credentials injected server-side)
// ===============================
const CATEGORIES_ENDPOINT = 'api/public/categories';

export const fetchPimCategories = async (
  channel?: string,
): Promise<{
  menuItems: MenuTreeNode[];
  flat: PimCategoryNode[];
}> => {
  const params: Record<string, string> = {};
  if (channel) params.channel = channel;

  const data = await get<PimCategoriesResponse>(
    CATEGORIES_ENDPOINT,
    Object.keys(params).length > 0 ? params : undefined,
  );

  if (!data.success) {
    throw new Error('PIM categories returned unsuccessful response');
  }

  return {
    menuItems: transformPimCategoriesTree(data.categories || []),
    flat: data.flat || [],
  };
};

// ===============================
// React Query hook
// ===============================
export const usePimCategoriesQuery = (options?: {
  channel?: string;
  enabled?: boolean;
  staleTime?: number;
}) => {
  const enabled = options?.enabled ?? true;
  const channel = options?.channel;

  return useQuery({
    queryKey: channel ? ['pim-categories', channel] : ['pim-categories'],
    queryFn: () => fetchPimCategories(channel),
    enabled,
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
  });
};
