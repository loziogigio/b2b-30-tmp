'use client';

import type { HeaderBlock } from '@/lib/home-settings/types';
import { TimeHeaderWidgetRenderer } from './time-header-widget-renderer';
import { cn } from '@/lib/utils';

interface TimeHeaderBlockRendererProps {
  block: HeaderBlock;
  lang: string;
}

const ALIGNMENT_CLASSES: Record<HeaderBlock['alignment'], string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

// Time-theme block renderer: identical layout shell to the shared one, but it
// routes each widget through TimeHeaderWidgetRenderer so the time theme can swap
// in its own DFL-styled widgets while leaving the default theme untouched.
export function TimeHeaderBlockRenderer({
  block,
  lang,
}: TimeHeaderBlockRendererProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 lg:gap-3 min-w-0',
        ALIGNMENT_CLASSES[block.alignment],
      )}
    >
      {block.widgets.map((widget) => (
        <TimeHeaderWidgetRenderer key={widget.id} widget={widget} lang={lang} />
      ))}
    </div>
  );
}
