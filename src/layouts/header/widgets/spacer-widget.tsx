'use client';

import type { WidgetConfig } from '@/lib/home-settings/types';

interface SpacerWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function SpacerWidget({}: SpacerWidgetProps) {
  return <div className="flex-1" />;
}
