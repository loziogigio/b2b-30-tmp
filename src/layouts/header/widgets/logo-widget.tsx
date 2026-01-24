'use client';

import Logo from '@components/ui/logo';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface LogoWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function LogoWidget({ lang }: LogoWidgetProps) {
  return <Logo className="h-10 md:h-12 w-auto" />;
}
