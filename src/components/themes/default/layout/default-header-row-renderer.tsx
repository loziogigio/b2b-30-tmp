'use client';

import type { HeaderRow, RowLayout } from '@/lib/home-settings/types';
import { HeaderBlockRenderer } from '@/layouts/header/header-block-renderer';
import { cn } from '@/lib/utils';

interface DefaultHeaderRowRendererProps {
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
  '50-50': 'flex flex-wrap lg:grid lg:grid-cols-[1fr_1fr]',
  '33-33-33': 'flex flex-wrap lg:grid lg:grid-cols-[1fr_1fr_1fr]',
  '20-60-20': 'flex justify-between lg:grid lg:grid-cols-[1fr_3fr_1fr]',
  '25-50-25': 'flex justify-between lg:grid lg:grid-cols-[1fr_2fr_1fr]',
  '30-40-30': 'flex justify-between lg:grid lg:grid-cols-[3fr_4fr_3fr]',
};

export function DefaultHeaderRowRenderer({
  row,
  lang,
  stickyTop,
  elevated,
  registerRef,
}: DefaultHeaderRowRendererProps) {
  if (!row.enabled) return null;

  const layoutClass =
    LAYOUT_CLASSES[row.layout] || 'flex lg:grid lg:grid-cols-3';

  const isFixed = !!row.fixed;

  return (
    <div
      ref={(el) => registerRef?.(row.id, el)}
      className={cn(
        'w-full border-b border-gray-100',
        // Fixed rows pin at their measured offset; scroll rows stay in flow.
        isFixed && 'sticky z-40',
        elevated && 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      )}
      style={{
        backgroundColor: row.backgroundColor || '#ffffff',
        color: row.textColor,
        height: row.height ? `${row.height}px` : undefined,
        top: isFixed ? (stickyTop ?? 0) : undefined,
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
