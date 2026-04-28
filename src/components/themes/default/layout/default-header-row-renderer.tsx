'use client';

import type { HeaderRow, RowLayout } from '@/lib/home-settings/types';
import { HeaderBlockRenderer } from '@/layouts/header/header-block-renderer';
import { cn } from '@/lib/utils';

interface DefaultHeaderRowRendererProps {
  row: HeaderRow;
  lang: string;
  isFirstRow?: boolean;
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
  isFirstRow,
}: DefaultHeaderRowRendererProps) {
  if (!row.enabled) return null;

  const layoutClass =
    LAYOUT_CLASSES[row.layout] || 'flex lg:grid lg:grid-cols-3';
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
