// components/b2b/B2BHeaderMenu.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from '@components/ui/link';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import {
  usePimMenuQuery,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import useWindowSize from '@utils/use-window-size';
import { slugify } from '@utils/slugify';

function NodeIcon({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="h-10 w-10 rounded object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}

interface MenuProps {
  lang: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: (props: {
    onClick: () => void;
    open: boolean;
  }) => React.ReactNode;
}

const DRAWER_W = 'w-[380px] md:w-[420px]';
const HEADER_H = 56; // h-14
const CRUMB_H = 36; // h-9

// Normalize ALL CAPS → we lowercase and rely on Tailwind .capitalize
const normalizeLabel = (s?: string) => (s ?? '').toLowerCase();

/**
 * Build pretty category URL using pre-slugified path from node.
 * Falls back to slugifying names if path is not available.
 */
function categoryHrefFromPath(
  lang: string,
  branch: MenuTreeNode[],
  tail?: MenuTreeNode,
) {
  // Use the tail's pre-built path if available (already slugified)
  if (tail?.path?.length) {
    return `/${lang}/category/${tail.path.join('/')}`;
  }
  // Fallback: build from branch + tail using slugified names
  const segments = [
    ...branch.map((n) => n.slug || slugify(n.name || n.label || String(n.id))),
    ...(tail
      ? [tail.slug || slugify(tail.name || tail.label || String(tail.id))]
      : []),
  ];
  return `/${lang}/category/${segments.join('/')}`;
}

const B2BHeaderMenu: React.FC<MenuProps> = ({
  lang,
  className,
  open: controlledOpen,
  onOpenChange,
  renderTrigger,
}) => {
  const { t } = useTranslation(lang, 'menu');
  const { width } = useWindowSize();
  const isMobile = (width ?? 0) < 768;

  // Fetch both header and mobile menus from PIM
  const {
    data: headerData,
    isLoading: headerLoading,
    isError: headerError,
  } = usePimMenuQuery({
    location: 'header',
    staleTime: 5 * 60 * 1000,
  });
  const { data: mobileData, isLoading: mobileLoading } = usePimMenuQuery({
    location: 'mobile',
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = headerLoading || mobileLoading;
  const isError = headerError;

  // Use mobile menu on mobile view if available, otherwise fallback to header
  const tree: MenuTreeNode[] = useMemo(() => {
    if (isMobile && mobileData?.menuItems && mobileData.menuItems.length > 0) {
      return mobileData.menuItems;
    }
    return headerData?.menuItems ?? [];
  }, [isMobile, mobileData, headerData]);

  const allCategoriesLabel = t('all-categories', {
    defaultValue: 'All Categories',
  });

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [path, setPath] = useState<MenuTreeNode[]>([]); // drilled nodes stack

  const currentLevel: MenuTreeNode[] = useMemo(
    () => (path.length === 0 ? tree : (path[path.length - 1]?.children ?? [])),
    [tree, path],
  );

  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const close = () => {
    setOpen(false);
    setPath([]);
  };
  const goBack = () =>
    path.length === 0 ? close() : setPath((p) => p.slice(0, -1));

  const handleItemClick = (node: MenuTreeNode) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    if (node.isGroup && hasChildren) setPath((p) => [...p, node]);
    else close(); // leaf: <Link> handles navigation
  };

  // keyboard support
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, path.length]);

  if (isLoading) {
    return (
      <nav
        className={cn(
          'headerMenu flex w-full relative -mx-3 xl:-mx-4',
          className,
        )}
      >
        <div className="py-3 px-4 text-sm">
          {t('loading', { defaultValue: 'Loading...' })}
        </div>
      </nav>
    );
  }
  if (isError) {
    return (
      <nav
        className={cn(
          'headerMenu flex w-full relative -mx-3 xl:-mx-4',
          className,
        )}
      >
        <div className="py-3 px-4 text-sm">
          {t('menu-error', { defaultValue: 'Menu unavailable right now.' })}
        </div>
      </nav>
    );
  }

  const headerTitle =
    path.length === 0 ? allCategoriesLabel : path[path.length - 1].label || '';

  // Custom trigger or default trigger
  const triggerButton = renderTrigger ? (
    renderTrigger({ onClick: () => setOpen(true), open })
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative inline-flex items-center py-2 px-3 text-sm lg:text-15px text-brand-dark hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="b2b-cats-drawer"
    >
      <span className="capitalize">{normalizeLabel(allCategoriesLabel)}</span>
      <span className="ml-2 text-xs opacity-60">▾</span>
    </button>
  );

  const wrapperElement = renderTrigger ? (
    <>
      {/* trigger */}
      {triggerButton}

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={close}
          aria-hidden
        />
      )}
    </>
  ) : (
    <nav
      className={cn(
        'headerMenu flex w-full relative -mx-3 xl:-mx-4',
        className,
      )}
    >
      {/* trigger */}
      {triggerButton}

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={close}
          aria-hidden
        />
      )}
    </nav>
  );

  return (
    <>
      {wrapperElement}

      {/* drawer */}
      <aside
        id="b2b-cats-drawer"
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-50 top-0 left-0 h-full bg-white shadow-2xl transform transition-transform duration-200 ease-out',
          DRAWER_W,
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* header */}
        <div className="flex items-center justify-between px-3 md:px-4 h-14 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {path.length > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="px-2 py-1 text-base text-gray-700 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label={t('back', { defaultValue: 'Back' })}
                title={t('back', { defaultValue: 'Back' })}
              >
                ←
              </button>
            ) : null}

            <div
              className="text-sm md:text-[15px] font-semibold text-gray-900 truncate capitalize"
              title={headerTitle}
            >
              {normalizeLabel(headerTitle)}
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label={t('close', { defaultValue: 'Close' })}
            title={t('close', { defaultValue: 'Close' })}
          >
            ×
          </button>
        </div>

        {/* breadcrumb (compact) */}
        {path.length > 0 && (
          <div className="px-3 md:px-4 h-9 border-b border-gray-100 flex items-center">
            <div className="text-[12px] text-gray-500 truncate w-full">
              <span className="capitalize">
                {normalizeLabel(allCategoriesLabel)}
              </span>
              {path.map((n, i) => (
                <span key={n.id} className="truncate">
                  {' / '}
                  <span
                    className={cn(
                      'capitalize',
                      i === path.length - 1 ? 'text-gray-800 font-medium' : '',
                    )}
                    title={n.label}
                  >
                    {normalizeLabel(n.label)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* list */}
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: `calc(100vh - ${HEADER_H + (path.length > 0 ? CRUMB_H : 0)}px)`,
          }}
        >
          <ul className="py-1">
            {/* See all categories link at root level */}
            {path.length === 0 && (
              <li>
                <Link
                  href={`/${lang}/category`}
                  className="block px-4 h-11 leading-[44px] text-[14px] font-medium text-brand hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 truncate border-b border-gray-100"
                  title={t('see-all-categories', {
                    defaultValue: 'See all categories',
                  })}
                  onClick={close}
                >
                  {t('see-all-categories', {
                    defaultValue: 'See all categories',
                  })}{' '}
                  →
                </Link>
              </li>
            )}

            {/* See all in ... (language-aware, parent-preserving URL) */}
            {path.length > 0 && (
              <li>
                {(() => {
                  const current = path[path.length - 1];
                  const hasChildren = (current.children?.length ?? 0) > 0;

                  const href = hasChildren
                    ? categoryHrefFromPath(lang, path) // /{lang}/category/parent/child
                    : (current.url as string); // leaf -> external/product listing

                  return (
                    <Link
                      href={href}
                      className="block px-4 h-11 leading-[44px] text-[14px] font-medium text-brand hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 truncate"
                      title={`${t('see-all-in', { defaultValue: 'See all in' })} ${current.label}`}
                      onClick={close}
                    >
                      {t('see-all-in', { defaultValue: 'See all in' })}{' '}
                      <span className="capitalize">
                        {normalizeLabel(current.label)}
                      </span>
                    </Link>
                  );
                })()}
              </li>
            )}

            {/* Nodes at current level */}
            {currentLevel.map((node) => {
              const hasChildren = (node.children?.length ?? 0) > 0;
              const isGroup = node.isGroup && hasChildren;
              const label = node.label ?? '';

              if (isGroup) {
                // drill deeper inside drawer
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(node)}
                      className="w-full flex items-center justify-between px-4 text-left h-12 text-[15px] text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      aria-haspopup="true"
                      aria-expanded="false"
                      title={label}
                    >
                      <span className="min-w-0 flex items-center gap-3">
                        <NodeIcon src={node.category_menu_image} alt={label} />
                        <span className="truncate capitalize">
                          {normalizeLabel(label)}
                        </span>
                      </span>
                      <span className="opacity-60">›</span>
                    </button>
                  </li>
                );
              }

              // leaf: go to its own URL; if missing, fallback to hierarchical category URL
              let leafHref = categoryHrefFromPath(lang, path, node);

              if (node.url) {
                const rawUrl = node.url.startsWith('/')
                  ? node.url
                  : `/${node.url}`;
                leafHref = rawUrl.startsWith(`/${lang}/`)
                  ? rawUrl
                  : `/${lang}${rawUrl}`;
              }

              return (
                <li key={node.id}>
                  <Link
                    href={leafHref}
                    className="block px-4 h-12 text-[15px] text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    title={label}
                    onClick={close}
                  >
                    <span className="min-w-0 flex items-center gap-3 leading-[48px]">
                      <NodeIcon src={node.category_menu_image} alt={label} />
                      <span className="truncate capitalize">
                        {normalizeLabel(label)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default B2BHeaderMenu;
