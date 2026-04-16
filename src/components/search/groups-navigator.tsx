'use client';

import React, { useMemo, useState, useCallback } from 'react';
const VISIBLE_COUNT = 5;
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import { IoChevronForward } from 'react-icons/io5';
import { HiOutlineViewGrid } from 'react-icons/hi';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import {
  usePimMenuQuery,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { useQuery } from '@tanstack/react-query';
import { fetchPimFilters } from '@framework/product/get-pim-filters';

const GROUP_PARAM = 'filters-attribute_erp_groups_ss';
const SEPARATOR = ';';

/** Extract the group code from a menu node's url (e.g. "/search?filters-attribute_erp_groups_ss=10" → "10") */
function extractGroupCode(node: MenuTreeNode): string | null {
  if (!node.url) return null;
  try {
    const qs = node.url.includes('?') ? node.url.split('?')[1] : '';
    const sp = new URLSearchParams(qs);
    return sp.get(GROUP_PARAM) || null;
  } catch {
    return null;
  }
}

/** Recursively find a node whose url contains the given group code */
function findNodeByGroupCode(
  tree: MenuTreeNode[],
  code: string,
): MenuTreeNode | null {
  for (const node of tree) {
    if (extractGroupCode(node) === code) return node;
    if (node.children.length) {
      const found = findNodeByGroupCode(node.children, code);
      if (found) return found;
    }
  }
  return null;
}

/** Build breadcrumb ancestor nodes by walking the tree following path segments */
function buildPathNodes(
  tree: MenuTreeNode[],
  target: MenuTreeNode,
): MenuTreeNode[] {
  const crumbs: MenuTreeNode[] = [];
  let level = tree;
  for (const seg of target.path) {
    const n = level.find((x) => x.slug === seg);
    if (!n) break;
    crumbs.push(n);
    level = n.children;
  }
  return crumbs;
}

interface GroupsNavigatorProps {
  lang: string;
}

/**
 * Breadcrumb for the groups hierarchy — rendered above the filter box.
 */
export function GroupsBreadcrumb({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { data: menuData } = usePimMenuQuery({
    location: 'header',
    channel: 'b2b',
    staleTime: 5 * 60 * 1000,
  });

  const tree = useMemo(() => menuData?.menuItems ?? [], [menuData]);

  const selectedCodes = useMemo(() => {
    const raw = searchParams?.get(GROUP_PARAM) || '';
    return raw.split(SEPARATOR).filter(Boolean);
  }, [searchParams]);

  const drilledNode = useMemo(() => {
    if (selectedCodes.length === 0 || tree.length === 0) return null;
    let deepest: MenuTreeNode | null = null;
    for (const code of selectedCodes) {
      const node = findNodeByGroupCode(tree, code);
      if (node && (!deepest || node.path.length > deepest.path.length))
        deepest = node;
    }
    return deepest;
  }, [selectedCodes, tree]);

  const breadcrumbPath = useMemo(() => {
    if (!drilledNode) return [];
    return buildPathNodes(tree, drilledNode);
  }, [tree, drilledNode]);

  const goToLevel = useCallback(
    (node: MenuTreeNode) => {
      const code = extractGroupCode(node);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (code) {
        params.set(GROUP_PARAM, code);
      } else {
        params.delete(GROUP_PARAM);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete(GROUP_PARAM);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  if (breadcrumbPath.length === 0) return null;

  const normalizeLabel = (s: string) => s.toLowerCase();

  return (
    <div className="flex items-center flex-wrap gap-1">
      {breadcrumbPath.map((node) => {
        const code = extractGroupCode(node);
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => {
              if (code) {
                // Remove this node and all deeper selections
                const params = new URLSearchParams(
                  searchParams?.toString() ?? '',
                );
                const remaining = selectedCodes.filter((c) => {
                  const n = findNodeByGroupCode(tree, c);
                  return n ? n.path.length < node.path.length : true;
                });
                if (remaining.length > 0) {
                  params.set(GROUP_PARAM, remaining.join(SEPARATOR));
                } else {
                  params.delete(GROUP_PARAM);
                }
                const qs = params.toString();
                router.push(qs ? `${pathname}?${qs}` : pathname, {
                  scroll: false,
                });
              }
            }}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium hover:bg-gray-200 transition-colors capitalize"
            title={node.label}
          >
            <span className="truncate max-w-[120px]">
              {normalizeLabel(node.label)}
            </span>
            <span className="text-gray-400 hover:text-gray-700">×</span>
          </button>
        );
      })}
    </div>
  );
}

export function GroupsNavigator({ lang }: GroupsNavigatorProps) {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { data: menuData, isLoading } = usePimMenuQuery({
    location: 'header',
    channel: 'b2b',
    staleTime: 5 * 60 * 1000,
  });

  const tree = useMemo(() => menuData?.menuItems ?? [], [menuData]);

  // Build search params for facet count query (exclude group filter itself)
  const facetQueryParams = useMemo(() => {
    const params: Record<string, any> = { lang };
    searchParams?.forEach((value, key) => {
      if (key === GROUP_PARAM) return; // exclude own filter to get full counts
      if (key.startsWith('filters-') || key === 'text') {
        params[key] = value;
      }
    });
    params.facet_fields = ['attribute_erp_groups_ss'];
    return params;
  }, [searchParams, lang]);

  // Fetch facet counts for groups
  const { data: groupFacets } = useQuery({
    queryKey: ['group-facets', facetQueryParams],
    queryFn: () => fetchPimFilters(facetQueryParams),
    staleTime: 1000 * 60 * 5,
    enabled: tree.length > 0,
  });

  // Build code → count map
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    const facet = groupFacets?.find((f) => f.key === 'attribute_erp_groups_ss');
    if (facet) {
      for (const v of facet.values) {
        map[v.value] = v.count;
      }
    }
    return map;
  }, [groupFacets]);

  // Current selected group codes from URL
  const selectedCodes = useMemo(() => {
    const raw = searchParams?.get(GROUP_PARAM) || '';
    return raw.split(SEPARATOR).filter(Boolean);
  }, [searchParams]);

  const [expanded, setExpanded] = useState(false);

  // Derive drilled node from URL — the deepest selected node with children
  // This survives page refresh since it's computed from URL params
  const drilledNode = useMemo(() => {
    if (selectedCodes.length === 0) return null;
    // Find the deepest selected node that has children (to show its children)
    let deepest: MenuTreeNode | null = null;
    for (const code of selectedCodes) {
      const node = findNodeByGroupCode(tree, code);
      if (node) {
        if (!deepest) deepest = node;
        else if (node.path.length > deepest.path.length) deepest = node;
      }
    }
    return deepest;
  }, [selectedCodes, tree]);

  // Build breadcrumb path for current drilled level
  const breadcrumbPath = useMemo(() => {
    if (!drilledNode) return [];
    return buildPathNodes(tree, drilledNode);
  }, [tree, drilledNode]);

  // Children to display: drilled node's children if it has any, otherwise its siblings
  const displayItems = useMemo(() => {
    if (!drilledNode) return tree;
    if (drilledNode.children.length > 0) return drilledNode.children;
    // Leaf node — show siblings (parent's children)
    const path = buildPathNodes(tree, drilledNode);
    if (path.length > 1) return path[path.length - 2].children;
    return tree;
  }, [tree, drilledNode]);

  // Toggle a group code in the URL filter
  const toggleGroup = useCallback(
    (code: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      const current = (params.get(GROUP_PARAM) || '')
        .split(SEPARATOR)
        .filter(Boolean);

      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];

      if (next.length > 0) {
        params.set(GROUP_PARAM, next.join(SEPARATOR));
      } else {
        params.delete(GROUP_PARAM);
      }

      setExpanded(false);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Drill into a group via chevron (select it to drill down)
  const drillInto = useCallback(
    (node: MenuTreeNode) => {
      const code = extractGroupCode(node);
      if (code) {
        toggleGroup(code);
      }
    },
    [toggleGroup],
  );

  // Navigate breadcrumb: set filter to the clicked ancestor
  const goToLevel = useCallback(
    (node: MenuTreeNode) => {
      const code = extractGroupCode(node);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (code) {
        params.set(GROUP_PARAM, code);
      } else {
        params.delete(GROUP_PARAM);
      }
      setExpanded(false);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Clear all group filters and go to root
  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete(GROUP_PARAM);
    setExpanded(false);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  if (isLoading || tree.length === 0) return null;

  const normalizeLabel = (s: string) => s.toLowerCase();

  return (
    <div className="block">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div>
            <DisclosureButton className="w-full flex items-center justify-between px-4 py-2">
              <span className="text-brand-dark font-semibold text-sm uppercase">
                {t('text-groups', { defaultValue: 'Groups' })}
              </span>
              {open ? (
                <IoIosArrowUp className="text-brand-dark text-opacity-80 text-sm" />
              ) : (
                <IoIosArrowDown className="text-brand-dark text-opacity-80 text-sm" />
              )}
            </DisclosureButton>
            <DisclosurePanel>
              <div className="px-4 pb-2">
                {/* Items at current level */}
                <div className="flex flex-col">
                  {(expanded
                    ? displayItems
                    : displayItems.slice(0, VISIBLE_COUNT)
                  ).map((node) => {
                    const code = extractGroupCode(node);
                    const isSelected = code
                      ? selectedCodes.includes(code)
                      : false;
                    const count = code ? (countMap[code] ?? 0) : 0;
                    const hasChildren =
                      node.isGroup && node.children.length > 0;

                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-1 py-0.5"
                      >
                        {/* Checkbox to toggle filter */}
                        <label className="group flex items-center justify-between text-sm cursor-pointer transition-all hover:text-opacity-80 text-brand-dark flex-1 min-w-0">
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              className="appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-brand checked:border-brand cursor-pointer shrink-0"
                              checked={isSelected}
                              onChange={() => code && toggleGroup(code)}
                              style={{
                                backgroundImage: isSelected
                                  ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                                  : 'none',
                                backgroundSize: '100% 100%',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                              }}
                            />
                            {node.category_menu_image && (
                              <img
                                src={node.category_menu_image}
                                alt=""
                                className="h-5 w-5 rounded object-cover shrink-0"
                                loading="lazy"
                              />
                            )}
                            <span
                              className={cn(
                                'capitalize truncate text-sm',
                                isSelected && 'font-semibold',
                                count === 0 && !isSelected && 'text-gray-400',
                              )}
                            >
                              {normalizeLabel(node.label)}
                            </span>
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-brand-dark/60 shrink-0 ml-1">
                              ({count})
                            </span>
                          )}
                        </label>

                        {/* Drill-down button for groups with children */}
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => drillInto(node)}
                            className="p-1 text-brand-dark/30 hover:text-brand shrink-0"
                            title={node.label}
                          >
                            <IoChevronForward className="text-xs" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {displayItems.length > VISIBLE_COUNT && (
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => !s)}
                      className="flex justify-start items-center w-full pt-1 text-xs font-medium text-brand focus:outline-none"
                    >
                      {expanded ? (
                        <span>- {t('text-see-less')}</span>
                      ) : (
                        <span>+ {t('text-see-more')}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
