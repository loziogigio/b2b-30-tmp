'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import { IoChevronForward } from 'react-icons/io5';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import type { PimFilterValue } from 'vinc-pim';

const CATEGORY_PARAM = 'filters-category_ancestors';
const SEPARATOR = ',';
const VISIBLE_COUNT = 8;

type Node = {
  id: string;
  label: string;
  count: number;
  level: number;
  parentId?: string;
};

interface CategoryNavigatorProps {
  lang: string;
  label: string;
  values: PimFilterValue[];
}

/**
 * Drill-down navigator for the `category_ancestors` facet.
 * Renders only the active level (children of the deepest selection)
 * with chevron drill-down + breadcrumb, instead of the flat list
 * (which produces duplicate same-label entries from L1/L2/L3).
 */
export function CategoryNavigator({
  lang,
  label,
  values,
}: CategoryNavigatorProps) {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Normalize facet rows into Node form
  const allNodes = useMemo<Node[]>(() => {
    return values
      .map((v) => {
        const entity: any = v.entity || {};
        const level = Number(entity.level ?? 0);
        const parentId = entity.parent_id
          ? String(entity.parent_id)
          : undefined;
        return {
          id: String(v.value),
          label: v.label,
          count: Number(v.count ?? 0),
          level,
          parentId,
        } as Node;
      })
      .filter((n) => n.level > 0);
  }, [values]);

  // childrenOf[parentId] -> Node[]
  const childrenOf = useMemo(() => {
    const map = new Map<string, Node[]>();
    for (const n of allNodes) {
      if (!n.parentId) continue;
      const arr = map.get(n.parentId) || [];
      arr.push(n);
      map.set(n.parentId, arr);
    }
    return map;
  }, [allNodes]);

  const byId = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of allNodes) m.set(n.id, n);
    return m;
  }, [allNodes]);

  // Currently selected ids (URL)
  const selectedIds = useMemo(() => {
    const raw = searchParams?.get(CATEGORY_PARAM) || '';
    return raw.split(SEPARATOR).filter(Boolean);
  }, [searchParams]);

  // Deepest selected node — defines the level we display
  const drilledNode = useMemo<Node | null>(() => {
    if (!selectedIds.length) return null;
    let deepest: Node | null = null;
    for (const id of selectedIds) {
      const n = byId.get(id);
      if (!n) continue;
      if (!deepest || n.level > deepest.level) deepest = n;
    }
    return deepest;
  }, [selectedIds, byId]);

  // Items to display = children of drilledNode, or all level-1 nodes
  const displayItems = useMemo<Node[]>(() => {
    let items: Node[];
    if (drilledNode) {
      items = childrenOf.get(drilledNode.id) || [];
    } else {
      items = allNodes.filter((n) => n.level === 1);
    }
    // Dedupe by id (defensive — facets may repeat)
    const seen = new Set<string>();
    items = items.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    // Hide unselected zero-count nodes — same rule as the general facets
    // (spec filters keep their own behavior). Selected nodes stay visible
    // so the filter can be untoggled.
    items = items.filter((n) => n.count > 0 || selectedIds.includes(n.id));
    return items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, undefined, { numeric: true });
    });
  }, [drilledNode, childrenOf, allNodes, selectedIds]);

  // Breadcrumb path = ancestors of drilledNode, climbing parentId chain
  const breadcrumbPath = useMemo<Node[]>(() => {
    if (!drilledNode) return [];
    const path: Node[] = [];
    let cursor: Node | undefined = drilledNode;
    while (cursor) {
      path.unshift(cursor);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return path;
  }, [drilledNode, byId]);

  const [expanded, setExpanded] = useState(false);

  const writeSelection = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (ids.length > 0) {
        params.set(CATEGORY_PARAM, ids.join(SEPARATOR));
      } else {
        params.delete(CATEGORY_PARAM);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  const drillInto = useCallback(
    (node: Node) => {
      setExpanded(false);
      writeSelection([node.id]);
    },
    [writeSelection],
  );

  const goToLevel = useCallback(
    (node: Node | null) => {
      setExpanded(false);
      writeSelection(node ? [node.id] : []);
    },
    [writeSelection],
  );

  const toggleLeaf = useCallback(
    (node: Node) => {
      const selected = selectedIds.includes(node.id);
      if (selected) {
        // Deselect this and any descendant ids
        const next = selectedIds.filter((id) => {
          if (id === node.id) return false;
          // Drop descendants that have this id in their parent chain
          let cursor = byId.get(id);
          while (cursor?.parentId) {
            if (cursor.parentId === node.id) return false;
            cursor = byId.get(cursor.parentId);
          }
          return true;
        });
        writeSelection(next);
      } else {
        writeSelection([node.id]);
      }
    },
    [selectedIds, byId, writeSelection],
  );

  if (allNodes.length === 0) return null;

  return (
    <div className="block">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div>
            <DisclosureButton className="w-full flex items-center justify-between px-4 py-2">
              <span className="text-brand-dark font-semibold text-sm uppercase">
                {label}
              </span>
              {open ? (
                <IoIosArrowUp className="text-brand-dark text-opacity-80 text-sm" />
              ) : (
                <IoIosArrowDown className="text-brand-dark text-opacity-80 text-sm" />
              )}
            </DisclosureButton>
            <DisclosurePanel>
              <div className="px-4 pb-2">
                {/* Breadcrumb path of drilled categories */}
                {breadcrumbPath.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => goToLevel(null)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium hover:bg-gray-200 transition-colors"
                      title={t('text-all', { defaultValue: 'All' })}
                    >
                      <span>{t('text-all', { defaultValue: 'All' })} ×</span>
                    </button>
                    {breadcrumbPath.map((n, i) => {
                      const isLast = i === breadcrumbPath.length - 1;
                      return (
                        <React.Fragment key={n.id}>
                          <IoChevronForward className="text-gray-400 text-xs" />
                          <button
                            type="button"
                            onClick={() => !isLast && goToLevel(n)}
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors capitalize',
                              isLast
                                ? 'bg-brand text-white cursor-default'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                            )}
                            title={n.label}
                          >
                            <span className="truncate max-w-[160px]">
                              {n.label}
                            </span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Items at current level */}
                <div className="flex flex-col">
                  {displayItems.length === 0 && (
                    <span className="text-xs text-gray-400 py-1">
                      {t('no-results-found', {
                        defaultValue: 'No more subcategories.',
                      })}
                    </span>
                  )}
                  {(expanded
                    ? displayItems
                    : displayItems.slice(0, VISIBLE_COUNT)
                  ).map((node) => {
                    const isSelected = selectedIds.includes(node.id);
                    const hasChildren =
                      (childrenOf.get(node.id) || []).length > 0;
                    return (
                      <div
                        key={node.id}
                        className="flex items-center gap-1 py-0.5"
                      >
                        <label className="group flex items-center justify-between text-sm cursor-pointer transition-all hover:text-opacity-80 text-brand-dark flex-1 min-w-0">
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              className="appearance-none w-4 h-4 border border-gray-300 rounded bg-white checked:bg-brand checked:border-brand cursor-pointer shrink-0"
                              checked={isSelected}
                              onChange={() => toggleLeaf(node)}
                              style={{
                                backgroundImage: isSelected
                                  ? "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")"
                                  : 'none',
                                backgroundSize: '100% 100%',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                              }}
                            />
                            <span
                              className={cn(
                                'capitalize truncate text-sm',
                                isSelected && 'font-semibold',
                                node.count === 0 &&
                                  !isSelected &&
                                  'text-gray-400',
                              )}
                            >
                              {node.label}
                            </span>
                          </span>
                          {node.count > 0 && (
                            <span className="text-xs text-brand-dark/60 shrink-0 ml-1">
                              ({node.count})
                            </span>
                          )}
                        </label>
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
