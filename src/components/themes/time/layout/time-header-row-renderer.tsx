'use client';

import type {
  HeaderRow,
  HeaderWidgetType,
  RowLayout,
} from '@/lib/home-settings/types';
import { HeaderBlockRenderer } from '@/layouts/header/header-block-renderer';
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

const LAYOUT_CLASSES: Record<RowLayout, string> = {
  full: 'flex flex-wrap lg:grid lg:grid-cols-1',
  '50-50': 'flex flex-wrap lg:grid lg:grid-cols-[50%_50%]',
  '33-33-33': 'flex flex-wrap lg:grid lg:grid-cols-3',
  '20-60-20': 'flex justify-between lg:grid lg:grid-cols-[20%_60%_20%]',
  '25-50-25': 'flex justify-between lg:grid lg:grid-cols-[25%_50%_25%]',
  '30-40-30': 'flex justify-between lg:grid lg:grid-cols-[30%_40%_30%]',
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
        backgroundColor: row.backgroundColor || '#ffffff',
        color: row.textColor,
        height: row.height ? `${row.height}px` : undefined,
        top: isFixed ? stickyTop ?? 0 : undefined,
      }}
    >
      <div
        className={cn(
          'mx-auto max-w-[1600px] items-center px-5 py-2 gap-2 lg:gap-4',
          layoutClass,
        )}
      >
        {row.blocks.map((block) => (
          <HeaderBlockRenderer key={block.id} block={block} lang={lang} />
        ))}
      </div>
    </div>
  );
}
