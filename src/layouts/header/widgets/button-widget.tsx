'use client';

import Link from '@components/ui/link';
import cn from 'classnames';
import { useUI } from '@contexts/ui.context';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface ButtonWidgetProps {
  config: WidgetConfig;
  lang: string;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-[#a52a2a] text-white shadow-sm',
  secondary: 'bg-brand text-white shadow-sm',
  outline: 'border border-slate-300 text-slate-700 hover:border-brand hover:text-brand',
  ghost: 'text-slate-700 hover:text-brand',
};

export function ButtonWidget({ config, lang }: ButtonWidgetProps) {
  const { isAuthorized } = useUI();

  if (!config?.label || !config?.url) return null;

  // If this is an account-related link (contains /account), only show when logged in
  const isAccountLink = config.url.includes('/account');
  if (isAccountLink && !isAuthorized) return null;

  const variant = config.variant || 'outline';
  const href = config.url.startsWith('/') ? `/${lang}${config.url}` : config.url;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold transition-colors whitespace-nowrap',
        variantStyles[variant] || variantStyles.outline,
      )}
    >
      {config.label}
    </Link>
  );
}
