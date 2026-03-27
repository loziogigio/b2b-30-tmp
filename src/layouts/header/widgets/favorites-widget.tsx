'use client';

import { useState, useEffect } from 'react';
import Link from '@components/ui/link';
import { HiOutlineHeart } from 'react-icons/hi';
import { useUI } from '@contexts/ui.context';
import { useLikes } from '@contexts/likes/likes.context';
import { useTranslation } from 'src/app/i18n/client';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface FavoritesWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function FavoritesWidget({ config, lang }: FavoritesWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { summary } = useLikes();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hide until hydrated to avoid server/client mismatch
  if (!mounted || !isAuthorized) return null;

  return (
    <div className="flex flex-col items-center group">
      <Link
        href={`/${lang}/search?source=likes&page_size=12`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 hover:border-rose-300 shrink-0"
        title={t('text-wishlist-tooltip', {
          defaultValue: 'I tuoi prodotti preferiti salvati',
        })}
      >
        <HiOutlineHeart className="h-5 w-5" />
        {summary?.totalCount ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
            {summary.totalCount}
          </span>
        ) : null}
      </Link>
      {config?.showLabel && (
        <span className="mt-1 text-[10px] text-slate-500">Preferiti</span>
      )}
    </div>
  );
}
