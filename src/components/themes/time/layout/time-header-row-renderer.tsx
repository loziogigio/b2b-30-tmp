'use client';

import type {
  HeaderRow,
  HeaderWidgetType,
  RowLayout,
} from '@/lib/home-settings/types';
import { TimeHeaderBlockRenderer } from './time-header-block-renderer';
import cn from 'classnames';

// Widgets that only render on desktop (lg+). A row containing nothing but these
// collapses to an empty padded strip with a stray border on mobile, so we hide
// the whole row below lg. Categories are reachable via the bottom navigation there.
const DESKTOP_ONLY_WIDGETS: ReadonlySet<HeaderWidgetType> = new Set([
  'category-menu',
  'company-info',
]);

interface TimeHeaderRowRendererProps {
  row: HeaderRow;
  lang: string;
  isFirstRow?: boolean;
  /** Sticky top offset (px) when the row is fixed; undefined for scroll rows. */
  stickyTop?: number;
  /** Whether this row should carry the scroll elevation shadow. */
  elevated?: boolean;
  /** Registers the row element so the header can measure fixed-row heights. */
  registerRef?: (id: string, el: HTMLElement | null) => void;
}

// Use fr units (not %) so the column gap is absorbed by the tracks instead of
// being added on top — percentages + gap overflow the container and push the
// right-hand block (e.g. the Accedi button) past the edge.
const LAYOUT_CLASSES: Record<RowLayout, string> = {
  full: 'flex flex-wrap lg:grid lg:grid-cols-1',
  '50-50': 'flex flex-wrap lg:grid lg:grid-cols-[1fr_1fr]',
  '33-33-33': 'flex flex-wrap lg:grid lg:grid-cols-3',
  '20-60-20': 'flex justify-between lg:grid lg:grid-cols-[1fr_3fr_1fr]',
  '25-50-25': 'flex justify-between lg:grid lg:grid-cols-[1fr_2fr_1fr]',
  '30-40-30': 'flex justify-between lg:grid lg:grid-cols-[3fr_4fr_3fr]',
};

export function TimeHeaderRowRenderer({
  row,
  lang,
  stickyTop,
  elevated,
  registerRef,
}: TimeHeaderRowRendererProps) {
  if (!row.enabled) return null;

  const layoutClass =
    LAYOUT_CLASSES[row.layout] || 'flex lg:grid lg:grid-cols-3';

  const isFixed = !!row.fixed;

  // Hide rows whose every widget is desktop-only, so they don't leave an empty
  // bordered band on mobile. Evaluated across all widgets so empty side-blocks
  // (e.g. a 20-60-20 layout with the menu in the middle) don't defeat it.
  const rowWidgets = row.blocks.flatMap((b) => b.widgets);
  const isDesktopOnlyRow =
    rowWidgets.length > 0 &&
    rowWidgets.every((w) => DESKTOP_ONLY_WIDGETS.has(w.type));

  // DFL La Mura: the category-nav row is a flat white strip (the items carry the
  // red active underline themselves), so force white here even if the tenant
  // config tints the row — the reference design wants the bar to disappear.
  const hasCategoryMenu = rowWidgets.some(
    (w) => w.type === 'category-menu' || w.type === 'categories',
  );

  return (
    <div
      ref={(el) => registerRef?.(row.id, el)}
      className={cn(
        'w-full border-b border-[var(--time-gray-100)]',
        isDesktopOnlyRow && 'hidden lg:block',
        // Fixed rows pin at their measured offset; scroll rows stay in flow.
        isFixed && 'sticky z-[100]',
        elevated && 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
      )}
      style={{
        backgroundColor: hasCategoryMenu
          ? '#ffffff'
          : row.backgroundColor || '#ffffff',
        color: row.textColor,
        height: row.height ? `${row.height}px` : undefined,
        top: isFixed ? (stickyTop ?? 0) : undefined,
      }}
    >
      <div
        className={cn(
          'mx-auto max-w-[1600px] items-center px-5 gap-2 lg:gap-4',
          // Category-nav row: drop the bottom padding so each item's red
          // hover/active underline (border-b) lands exactly on the row's bottom
          // edge — i.e. flush with the red line of the mega-dropdown below it.
          hasCategoryMenu ? 'pt-2 pb-0' : 'py-2',
          layoutClass,
        )}
      >
        {row.blocks.map((block) => (
          <TimeHeaderBlockRenderer key={block.id} block={block} lang={lang} />
        ))}
      </div>
    </div>
  );
}
