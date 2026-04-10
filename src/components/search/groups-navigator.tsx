'use client';

import React, { useMemo, useState, useCallback } from 'react';
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

  // Current selected group codes from URL
  const selectedCodes = useMemo(() => {
    const raw = searchParams?.get(GROUP_PARAM) || '';
    return raw.split(SEPARATOR).filter(Boolean);
  }, [searchParams]);

  // Track which level the user is viewing (drill-down state)
  // null = root level, otherwise the node whose children are displayed
  const [drilledNode, setDrilledNode] = useState<MenuTreeNode | null>(null);

  // Auto-detect drilled level from selected codes
  const effectiveDrilledNode = useMemo(() => {
    if (drilledNode) return drilledNode;
    // If a code is selected, show its parent's level (siblings)
    if (selectedCodes.length > 0) {
      const firstNode = findNodeByGroupCode(tree, selectedCodes[0]);
      if (firstNode) {
        const pathNodes = buildPathNodes(tree, firstNode);
        // Show the parent level (so selected item is visible among siblings)
        if (pathNodes.length > 1) {
          return pathNodes[pathNodes.length - 2];
        }
      }
    }
    return null;
  }, [drilledNode, selectedCodes, tree]);

  // Build breadcrumb path for current drilled level
  const breadcrumbPath = useMemo(() => {
    if (!effectiveDrilledNode) return [];
    return buildPathNodes(tree, effectiveDrilledNode);
  }, [tree, effectiveDrilledNode]);

  // Children to display at current level
  const displayItems = useMemo(() => {
    if (effectiveDrilledNode) return effectiveDrilledNode.children;
    return tree;
  }, [tree, effectiveDrilledNode]);

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

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Drill into a group to see its children
  const drillInto = useCallback((node: MenuTreeNode) => {
    setDrilledNode(node);
  }, []);

  // Navigate breadcrumb: go back to a specific level
  const goToLevel = useCallback(
    (node: MenuTreeNode | null) => {
      setDrilledNode(node);
    },
    [],
  );

  // Clear all group filters and go to root
  const clearAll = useCallback(() => {
    setDrilledNode(null);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete(GROUP_PARAM);
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
                {/* Breadcrumb path when drilled in */}
                {breadcrumbPath.length > 0 && (
                  <nav className="flex items-center gap-1 text-xs mb-2 overflow-x-auto whitespace-nowrap">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-brand hover:underline inline-flex items-center gap-0.5 shrink-0"
                    >
                      <HiOutlineViewGrid className="text-sm" />
                      <span>
                        {t('all-groups', { defaultValue: 'All Groups' })}
                      </span>
                    </button>
                    {breadcrumbPath.map((node, idx) => {
                      const isLast = idx === breadcrumbPath.length - 1;
                      return (
                        <React.Fragment key={node.id}>
                          <IoChevronForward className="text-brand-dark/40 text-[10px] shrink-0" />
                          {isLast ? (
                            <span
                              className="font-semibold text-brand-dark truncate capitalize"
                              title={node.label}
                            >
                              {normalizeLabel(node.label)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => goToLevel(node)}
                              className="text-brand hover:underline truncate capitalize"
                              title={node.label}
                            >
                              {normalizeLabel(node.label)}
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </nav>
                )}

                {/* Items at current level */}
                <div className="flex flex-col">
                  {displayItems.map((node) => {
                    const code = extractGroupCode(node);
                    const isSelected = code
                      ? selectedCodes.includes(code)
                      : false;
                    const hasChildren =
                      node.isGroup && node.children.length > 0;

                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-1 py-0.5"
                      >
                        {/* Checkbox to toggle filter */}
                        <label className="group flex items-center gap-2 text-sm cursor-pointer transition-all hover:text-opacity-80 text-brand-dark flex-1 min-w-0">
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
                            )}
                          >
                            {normalizeLabel(node.label)}
                          </span>
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
                </div>
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
