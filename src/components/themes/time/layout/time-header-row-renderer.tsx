'use client';

import type { HeaderRow, RowLayout } from '@/lib/home-settings/types';
import { HeaderBlockRenderer } from '@/layouts/header/header-block-renderer';
import cn from 'classnames';

interface TimeHeaderRowRendererProps {
  row: HeaderRow;
  lang: string;
  isFirstRow?: boolean;
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
  isFirstRow,
}: TimeHeaderRowRendererProps) {
  if (!row.enabled) return null;

  const layoutClass =
    LAYOUT_CLASSES[row.layout] || 'flex lg:grid lg:grid-cols-3';

  return (
    <div
      className="w-full border-b border-[var(--time-gray-100)]"
      style={{
        backgroundColor: row.backgroundColor || '#ffffff',
        color: row.textColor,
        height: row.height ? `${row.height}px` : undefined,
      }}
    >
      <div
        className={cn(
          'mx-auto max-w-[1400px] items-center px-4 md:px-8 py-2 gap-2 lg:gap-4',
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
