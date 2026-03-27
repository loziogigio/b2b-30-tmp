'use client';

import { useState, useEffect } from 'react';
import Link from '@components/ui/link';
import { ReminderIcon } from '@components/icons/app-icons';
import { useUI } from '@contexts/ui.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useTranslation } from 'src/app/i18n/client';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface RemindersWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function RemindersWidget({ config, lang }: RemindersWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { summary } = useReminders();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hide until hydrated to avoid server/client mismatch
  if (!mounted || !isAuthorized) return null;

  return (
    <div className="flex flex-col items-center group">
      <Link
        href={`/${lang}/search?source=reminders&page_size=12`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-500 hover:bg-amber-100 hover:border-amber-300 shrink-0"
        title={t('text-reminders-tooltip', {
          defaultValue: 'Prodotti da avvisare quando disponibili',
        })}
      >
        <ReminderIcon className="h-5 w-5" />
        {summary?.totalCount ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
            {summary.totalCount}
          </span>
        ) : null}
      </Link>
      {config?.showLabel && (
        <span className="mt-1 text-[10px] text-slate-500">
          {t('text-reminders', { defaultValue: 'Promemoria' })}
        </span>
      )}
    </div>
  );
}
