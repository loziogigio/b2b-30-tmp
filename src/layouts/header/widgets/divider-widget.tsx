'use client';

import type { WidgetConfig } from '@/lib/home-settings/types';

interface DividerWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function DividerWidget({}: DividerWidgetProps) {
  return <div className="h-6 w-px bg-slate-200" />;
}
