'use client';

import type { HeaderBlock } from '@/lib/home-settings/types';
import { HeaderWidgetRenderer } from './header-widget-renderer';
import { cn } from '@/lib/utils';

interface HeaderBlockRendererProps {
  block: HeaderBlock;
  lang: string;
}

const ALIGNMENT_CLASSES: Record<HeaderBlock['alignment'], string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export function HeaderBlockRenderer({ block, lang }: HeaderBlockRendererProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 lg:gap-3 min-w-0',
        ALIGNMENT_CLASSES[block.alignment],
      )}
    >
      {block.widgets.map((widget) => (
        <HeaderWidgetRenderer key={widget.id} widget={widget} lang={lang} />
      ))}
    </div>
  );
}
