'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from '@components/ui/link';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import {
  usePimMenuQuery,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { useCategoryRoot } from '@/contexts/category-root.context';
import { categoryMenuHref } from '@/lib/seo/category-root';

interface InlineMenuProps {
  lang: string;
  channel?: string;
  className?: string;
  /** Vertical padding utility for the top-level macro items + the Altro
   *  trigger. Defaults to the original `py-4`; themes can tighten the bar. */
  itemPaddingY?: string;
  categoryRoot?: string;
}

const HOVER_OPEN_DELAY_MS = 90;
const HOVER_CLOSE_DELAY_MS = 180;

/** Recursive leaf count (a childless node counts as 1) for the rail badges. */
function leafCount(node: MenuTreeNode): number {
  const kids = node.children ?? [];
  if (!kids.length) return 1;
  return kids.reduce((sum, c) => sum + leafCount(c), 0);
}

/**
 * Mega-menu (inline) category navigation, modelled on the DFL La Mura mockup
 * but themed with CSS tokens (`--color-brand`, gray scale) so it adapts per
 * tenant/theme. A hover row of macro groups drops a full-width panel:
 *   - left rail   = the macro's groups, each with its icon thumbnail + count
 *   - middle      = the active group's leaves, in responsive columns
 * Each entry navigates to the menu node's own PIM-authored destination
 * (`node.url`); a parent without its own url falls back to its first child
 * that has one, so the entry still lands somewhere sensible.
 */
const B2BInlineCategoryMenu: React.FC<InlineMenuProps> = ({
  lang,
  channel,
  className,
  itemPaddingY = 'py-4',
  categoryRoot: categoryRootOverride,
}) => {
  const { t } = useTranslation(lang, 'menu');
  const providerCategoryRoot = useCategoryRoot(lang);
  const categoryRoot = categoryRootOverride || providerCategoryRoot;
  const { data, isLoading, isError } = usePimMenuQuery({
    location: 'header',
    channel,
    lang,
    staleTime: 5 * 60 * 1000,
  });

  const tree: MenuTreeNode[] = data?.menuItems ?? [];

  const hrefFor = useCallback(
    (node: MenuTreeNode): string => {
      const target = node.url
        ? node
        : (node.children?.find((child) => child.url) ?? node);
      return categoryMenuHref(
        lang,
        target.path?.length ? target.path : node.path,
        categoryRoot,
        target.url,
      );
    },
    [categoryRoot, lang],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The macro row may live inside a narrow header block (e.g. a 50/50 row),
  // so the dropdown is pinned to the viewport and stretched to the full bar
  // width; its vertical offset tracks the bottom of this nav.
  const navRef = useRef<HTMLElement>(null);
  const [panelTop, setPanelTop] = useState(0);

  // Priority-plus overflow: render the macros that fit in the available width
  // and collapse the rest into an "Altro" dropdown. `measureRef` is an
  // invisible row holding every macro (at natural width) so we can decide the
  // split without the visible row ever clipping.
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(Number.MAX_SAFE_INTEGER);
  const [altroOpen, setAltroOpen] = useState(false);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const openMacro = useCallback((id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpenId(id);
      setActiveGroup(0);
    }, HOVER_OPEN_DELAY_MS);
  }, []);

  const scheduleClose = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(
      () => setOpenId(null),
      HOVER_CLOSE_DELAY_MS,
    );
  }, []);

  // Immediate, explicit close (× button, click-outside, Escape).
  const closeMenu = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenId(null);
    setAltroOpen(false);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Escape closes; a click outside the nav (and its dropdown) closes too.
  useEffect(() => {
    if (!openId && !altroOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [openId, altroOpen, closeMenu]);

  // Track the nav's bottom edge so the fixed, full-width dropdown sits flush
  // under the macro row (and follows it on scroll / resize).
  useLayoutEffect(() => {
    if (!openId) return;
    const measure = () => {
      const r = navRef.current?.getBoundingClientRect();
      if (r) setPanelTop(r.bottom);
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [openId]);

  // Decide how many macros fit, the rest go under "Altro". The available width
  // is the full bar — from where the row starts to the right edge of the
  // header's max-width container — not just this (possibly 50%) header block,
  // so the menu uses the whole width based on the screen.
  useLayoutEffect(() => {
    const compute = () => {
      const row = rowRef.current;
      const meas = measureRef.current;
      if (!row || !meas) return;
      const items = Array.from(meas.children) as HTMLElement[];
      if (items.length <= 1) return;
      const altroW = items[items.length - 1]?.offsetWidth ?? 80;
      const widths = items.slice(0, -1).map((el) => el.offsetWidth);
      const total = widths.reduce((a, b) => a + b, 0);
      const container = row.closest('.mx-auto') as HTMLElement | null;
      const rowLeft = row.getBoundingClientRect().left;
      const avail = container
        ? Math.max(0, container.getBoundingClientRect().right - 20 - rowLeft)
        : row.clientWidth;
      if (total <= avail) {
        setVisibleCount(widths.length);
        return;
      }
      let used = 0;
      let n = 0;
      for (const w of widths) {
        if (used + w <= avail - altroW) {
          used += w;
          n++;
        } else break;
      }
      setVisibleCount(Math.max(1, n));
    };
    compute();
    const ro = new ResizeObserver(compute);
    const container = rowRef.current?.closest('.mx-auto');
    if (container) ro.observe(container);
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [tree]);

  // Close the Altro dropdown whenever the menu closes.
  useEffect(() => {
    if (!openId) setAltroOpen(false);
  }, [openId]);

  if (isLoading) {
    return (
      <nav className={cn('flex items-center text-sm', className)}>
        <span className="px-3 py-2 text-gray-400">
          {t('loading', { defaultValue: 'Loading...' })}
        </span>
      </nav>
    );
  }
  if (isError || tree.length === 0) {
    return null;
  }

  const openMacroNode = tree.find((m) => m.id === openId) ?? null;
  const groups = openMacroNode?.children ?? [];
  const activeGroupNode = groups[activeGroup] ?? groups[0] ?? null;
  const leaves = activeGroupNode?.children ?? [];

  // A macro is "flat" when none of its groups have children of their own — the
  // dropdown is then a single level, so the rail + empty leaves panel is wasteful.
  // Render the groups directly as a full-width grid instead (see drop panel).
  const isFlat = groups.length > 0 && groups.every((g) => !g.children?.length);

  const safeVisible = Math.min(visibleCount, tree.length);
  const visibleMacros = tree.slice(0, safeVisible);
  const hiddenMacros = tree.slice(safeVisible);
  const altroLabel = t('more', { defaultValue: 'Altro' });

  // Shared macro trigger — used in the visible row and inside the Altro
  // dropdown so overflowed macros open the same full mega panel.
  const renderMacro = (macro: MenuTreeNode) => {
    const isOpen = openId === macro.id;
    const hasChildren = (macro.children?.length ?? 0) > 0;
    return (
      <li
        key={macro.id}
        onMouseEnter={() => {
          // Moving onto a visible macro dismisses the Altro overflow list so
          // it never overlaps this macro's mega panel.
          setAltroOpen(false);
          if (hasChildren) openMacro(macro.id);
        }}
      >
        <Link
          href={hrefFor(macro)}
          prefetch={false}
          onClick={() => {
            setOpenId(null);
            setAltroOpen(false);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap px-4 text-[14px] font-bold uppercase tracking-tight transition-colors',
            itemPaddingY,
            'border-b-[3px] font-[family-name:var(--font-display)]',
            isOpen
              ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
              : 'border-transparent text-gray-600 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
          )}
        >
          <span>{macro.label || macro.name}</span>
          {hasChildren && (
            <span
              className={cn(
                'text-[9px] text-gray-400 transition-transform',
                isOpen && 'rotate-180 text-[var(--color-brand)]',
              )}
            >
              ▼
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav
      ref={navRef}
      className={cn('relative flex items-stretch', className)}
      onMouseLeave={scheduleClose}
    >
      {/* Macro row (priority-plus): the macros that fit across the full bar,
          then an Altro overflow. The row is sized to its content and is allowed
          to extend past its (possibly 50%) header block into the empty bar. */}
      <div ref={rowRef} className="flex items-stretch">
        <ul className="flex items-stretch">
          {visibleMacros.map((macro) => renderMacro(macro))}
        </ul>

        {hiddenMacros.length > 0 && (
          <div
            className="flex items-stretch"
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
              setAltroOpen(true);
              if (hiddenMacros[0]) openMacro(hiddenMacros[0].id);
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (altroOpen) {
                  setAltroOpen(false);
                  setOpenId(null);
                } else {
                  setAltroOpen(true);
                  if (hiddenMacros[0]) openMacro(hiddenMacros[0].id);
                }
              }}
              aria-haspopup="true"
              aria-expanded={altroOpen}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap px-4 text-[14px] font-bold uppercase tracking-tight transition-colors',
                itemPaddingY,
                'border-b-[3px] font-[family-name:var(--font-display)]',
                altroOpen
                  ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                  : 'border-transparent text-gray-600 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
              )}
            >
              <span>{altroLabel}</span>
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[11px] font-bold leading-none text-white">
                {hiddenMacros.length}
              </span>
              <span
                className={cn(
                  'text-[9px] text-gray-400 transition-transform',
                  altroOpen && 'rotate-180 text-[var(--color-brand)]',
                )}
              >
                ▼
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Invisible measuring row: every macro + an Altro stand-in at natural
          width, so the split can be computed without the visible row clipping.
          Wrapped in a 0×0 overflow-hidden box so its full content width never
          contributes to document horizontal overflow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
      >
        <ul ref={measureRef} className="flex items-stretch">
          {tree.map((macro) => (
            <li
              key={`measure-${macro.id}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-4 text-[14px] font-bold uppercase tracking-tight font-[family-name:var(--font-display)]"
            >
              <span>{macro.label || macro.name}</span>
              {(macro.children?.length ?? 0) > 0 && (
                <span className="text-[9px]">▼</span>
              )}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-4 text-[14px] font-bold uppercase tracking-tight font-[family-name:var(--font-display)]">
            <span>{altroLabel}</span>
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] leading-none">
              00
            </span>
            <span className="text-[9px]">▼</span>
          </li>
        </ul>
      </div>

      {/* Drop panel — pinned to the viewport and stretched to the full bar
          width, regardless of how narrow the nav's header block is. The inner
          wrapper re-aligns content to the header's max-w container. */}
      {openMacroNode && groups.length > 0 && (
        <div
          className="fixed left-0 right-0 z-50"
          style={{ top: panelTop }}
          role="menu"
          onMouseEnter={() => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
          }}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto max-w-[1600px] px-5">
            <div
              className={cn(
                'relative grid min-h-[360px] animate-megadrop grid-cols-1 overflow-hidden rounded-b-[var(--radius-card,12px)] border border-t-[3px] border-gray-200 border-t-[var(--color-brand)] bg-white shadow-[0_24px_60px_-22px_rgba(20,24,33,.30)]',
                isFlat
                  ? ''
                  : altroOpen
                    ? 'md:grid-cols-[210px_240px_minmax(0,1fr)]'
                    : 'md:grid-cols-[262px_minmax(0,1fr)]',
              )}
            >
              {!isFlat && (
                <>
                  {/* Altro rail = the overflowed macros (only when Altro is active) */}
                  {altroOpen && (
                    <div className="border-b border-gray-200 bg-gray-50 p-2.5 md:border-b-0 md:border-r">
                      <div className="px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400">
                        {altroLabel}
                      </div>
                      <ul>
                        {hiddenMacros.map((macro) => {
                          const active = openId === macro.id;
                          return (
                            <li key={macro.id}>
                              <Link
                                href={hrefFor(macro)}
                                prefetch={false}
                                onMouseEnter={() => openMacro(macro.id)}
                                onFocus={() => openMacro(macro.id)}
                                onClick={() => {
                                  setOpenId(null);
                                  setAltroOpen(false);
                                }}
                                className={cn(
                                  'flex items-center justify-between gap-2 rounded-[9px] px-3 py-2.5 text-[13px] font-bold uppercase leading-tight transition-colors font-[family-name:var(--font-display)]',
                                  active
                                    ? 'bg-white text-[var(--color-brand)] shadow-[inset_3px_0_0_var(--color-brand)]'
                                    : 'text-gray-600 hover:bg-white hover:text-gray-900',
                                )}
                              >
                                <span>{macro.label || macro.name}</span>
                                <span className="text-[10px] text-gray-400">
                                  ›
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {/* Left rail = groups */}
                  <div className="border-b border-gray-200 bg-gray-50 p-2.5 md:border-b-0 md:border-r">
                    <div className="px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400">
                      {t('groups', { defaultValue: 'Gruppi' })} ·{' '}
                      {openMacroNode.label || openMacroNode.name}
                    </div>
                    <ul>
                      {groups.map((g, gi) => {
                        const active = gi === activeGroup;
                        return (
                          <li key={g.id}>
                            <Link
                              href={hrefFor(g)}
                              prefetch={false}
                              onMouseEnter={() => setActiveGroup(gi)}
                              onFocus={() => setActiveGroup(gi)}
                              onClick={() => setOpenId(null)}
                              className={cn(
                                'flex items-center gap-2.5 rounded-[9px] px-3.5 py-2.5 text-[14px] font-bold transition-colors font-[family-name:var(--font-display)]',
                                active
                                  ? 'bg-white text-[var(--color-brand)] shadow-[inset_3px_0_0_var(--color-brand)]'
                                  : 'text-gray-600 hover:bg-white hover:text-gray-900',
                              )}
                            >
                              <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-[7px] border border-gray-200 bg-white">
                                {g.category_menu_image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={g.category_menu_image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <span className="text-[13px] font-bold text-gray-400">
                                    {(g.label || g.name || '?').charAt(0)}
                                  </span>
                                )}
                              </span>
                              <span className="flex-1 leading-tight">
                                {g.label || g.name}
                              </span>
                              {leafCount(g) > 1 && (
                                <span className="text-[11px] tabular-nums text-gray-400">
                                  {leafCount(g)}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Middle = active group's leaves */}
                  <div className="p-5 lg:px-6">
                    <div className="mb-3.5 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <h3 className="truncate text-[17px] font-extrabold uppercase tracking-tight text-gray-900 font-[family-name:var(--font-display)]">
                        {activeGroupNode?.label || activeGroupNode?.name}
                      </h3>
                      <div className="flex flex-none items-center gap-3">
                        {activeGroupNode &&
                          hrefFor(activeGroupNode) !== '#' && (
                            <Link
                              href={hrefFor(activeGroupNode)}
                              prefetch={false}
                              onClick={() => setOpenId(null)}
                              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--color-brand)]"
                            >
                              {t('view-all', { defaultValue: 'Vedi tutto' })} ›
                            </Link>
                          )}
                        <button
                          type="button"
                          onClick={closeMenu}
                          aria-label={t('close', { defaultValue: 'Chiudi' })}
                          title={t('close', { defaultValue: 'Chiudi' })}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <span className="text-[16px] leading-none">×</span>
                        </button>
                      </div>
                    </div>

                    {leaves.length > 0 ? (
                      <div className="columns-2 gap-6 lg:columns-3 xl:columns-4">
                        {leaves.map((leaf) => (
                          <Link
                            key={leaf.id}
                            href={hrefFor(leaf)}
                            prefetch={false}
                            onClick={() => setOpenId(null)}
                            className="flex break-inside-avoid items-baseline gap-1.5 rounded-md py-1.5 pl-0.5 pr-1.5 text-[13.5px] leading-tight text-gray-600 transition-colors hover:bg-[var(--color-brand)]/5 hover:text-[var(--color-brand)]"
                          >
                            <span className="flex-none font-extrabold text-[var(--color-brand)]">
                              ›
                            </span>
                            <span>{leaf.label || leaf.name}</span>
                          </Link>
                        ))}
                      </div>
                    ) : activeGroupNode && hrefFor(activeGroupNode) !== '#' ? (
                      <Link
                        href={hrefFor(activeGroupNode)}
                        prefetch={false}
                        onClick={() => setOpenId(null)}
                        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-brand)]"
                      >
                        {t('view-all', { defaultValue: 'Vedi tutto' })} ›
                      </Link>
                    ) : null}
                  </div>
                </>
              )}

              {/* Flat macro: its groups have no children, so render them directly
                as a full-width grid instead of a rail + empty leaves panel. */}
              {isFlat && (
                <div className="p-5 lg:px-6">
                  <div className="mb-3.5 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <h3 className="truncate text-[17px] font-extrabold uppercase tracking-tight text-gray-900 font-[family-name:var(--font-display)]">
                      {openMacroNode.label || openMacroNode.name}
                    </h3>
                    <div className="flex flex-none items-center gap-3">
                      {hrefFor(openMacroNode) !== '#' && (
                        <Link
                          href={hrefFor(openMacroNode)}
                          prefetch={false}
                          onClick={() => setOpenId(null)}
                          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--color-brand)]"
                        >
                          {t('view-all', { defaultValue: 'Vedi tutto' })} ›
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={closeMenu}
                        aria-label={t('close', { defaultValue: 'Chiudi' })}
                        title={t('close', { defaultValue: 'Chiudi' })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <span className="text-[16px] leading-none">×</span>
                      </button>
                    </div>
                  </div>
                  <div className="columns-2 gap-6 lg:columns-3 xl:columns-4">
                    {groups.map((g) => (
                      <Link
                        key={g.id}
                        href={hrefFor(g)}
                        prefetch={false}
                        onClick={() => setOpenId(null)}
                        className="flex break-inside-avoid items-baseline gap-1.5 rounded-md py-1.5 pl-0.5 pr-1.5 text-[13.5px] leading-tight text-gray-600 transition-colors hover:bg-[var(--color-brand)]/5 hover:text-[var(--color-brand)]"
                      >
                        <span className="flex-none font-extrabold text-[var(--color-brand)]">
                          ›
                        </span>
                        <span>{g.label || g.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default B2BInlineCategoryMenu;
