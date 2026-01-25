'use client';

import type { HeaderRow, RowLayout } from '@/lib/home-settings/types';
import { HeaderBlockRenderer } from './header-block-renderer';
import { cn } from '@/lib/utils';

interface HeaderRowRendererProps {
  row: HeaderRow;
  lang: string;
  isFirstRow?: boolean;
}

// Responsive layout classes - uses lg breakpoint to match bottom navigation
// Using explicit percentages for precise layout control
const LAYOUT_CLASSES: Record<RowLayout, string> = {
  full: 'flex flex-wrap lg:grid lg:grid-cols-1',
  '50-50': 'flex flex-wrap lg:grid lg:grid-cols-[50%_50%]',
  '33-33-33': 'flex flex-wrap lg:grid lg:grid-cols-3',
  '20-60-20': 'flex justify-between lg:grid lg:grid-cols-[20%_60%_20%]',
  '25-50-25': 'flex justify-between lg:grid lg:grid-cols-[25%_50%_25%]',
  '30-40-30': 'flex justify-between lg:grid lg:grid-cols-[30%_40%_30%]',
};

export function HeaderRowRenderer({
  row,
  lang,
  isFirstRow,
}: HeaderRowRendererProps) {
  if (!row.enabled) {
    return null;
  }

  const layoutClass =
    LAYOUT_CLASSES[row.layout] || 'flex lg:grid lg:grid-cols-3';

  // Calculate sticky top position: first row is top-0, subsequent rows stack below
  // Primary row (first) is typically ~64px, secondary stacks at top-16
  const stickyTop = isFirstRow ? 'lg:top-0' : 'lg:top-16';

  return (
    <div
      className={cn(
        'w-full border-b border-gray-100',
        row.fixed && `lg:sticky ${stickyTop} z-40`,
      )}
      style={{
        backgroundColor: row.backgroundColor || '#ffffff',
        color: row.textColor,
        height: row.height ? `${row.height}px` : undefined,
      }}
    >
      <div
        className={cn(
          'mx-auto max-w-[1920px] items-center px-4 md:px-6 lg:px-8 2xl:px-10 py-2 gap-2 lg:gap-4',
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
