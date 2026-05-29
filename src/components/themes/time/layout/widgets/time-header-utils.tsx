'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@components/ui/link';
import {
  HiOutlineHeart,
  HiOutlineUserCircle,
  HiOutlineSwitchHorizontal,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import { ReminderIcon } from '@components/icons/app-icons';
import { useUI } from '@contexts/ui.context';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useCompareList } from '@/contexts/compare/compare.context';
import { useTranslation } from 'src/app/i18n/client';
import { ROUTES } from '@utils/routes';
import { ProfileWidget } from '@/layouts/header/widgets';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface UtilWidgetProps {
  config: WidgetConfig;
  lang: string;
}

// DFL La Mura header utilities: flat muted line-icons (no filled circle chip),
// red on hover, with a small red count badge so the counts still read. Mirrors
// dfl_catalog_restyle.jsx's quiet utility row.
const ICON_BTN =
  'relative inline-flex h-9 w-9 items-center justify-center text-[var(--time-gray-500)] hover:text-[var(--time-red)] transition-colors shrink-0';
const BADGE =
  'absolute -top-1 -right-1 rounded-full bg-[var(--time-red)] px-1.5 text-[10px] font-semibold leading-[15px] text-white';
const ICON = 'h-[19px] w-[19px]';

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Shared shape for the favorites / reminders / compare icons: a muted line-icon
// link with an optional red count badge.
function UtilIconLink({
  href,
  title,
  icon,
  count,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <Link href={href} className={ICON_BTN} title={title}>
      {icon}
      {count ? <span className={BADGE}>{count}</span> : null}
    </Link>
  );
}

export function TimeFavoritesWidget({ lang }: UtilWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { summary } = useLikes();
  const mounted = useMounted();
  if (!mounted || !isAuthorized) return null;
  return (
    <UtilIconLink
      href={`/${lang}/search?source=likes&page_size=12`}
      title={t('text-wishlist-tooltip', {
        defaultValue: 'I tuoi prodotti preferiti salvati',
      })}
      icon={<HiOutlineHeart className={ICON} />}
      count={summary?.totalCount}
    />
  );
}

export function TimeRemindersWidget({ lang }: UtilWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { summary } = useReminders();
  const mounted = useMounted();
  if (!mounted || !isAuthorized) return null;
  return (
    <UtilIconLink
      href={`/${lang}/search?source=reminders&page_size=12`}
      title={t('text-reminders-tooltip', {
        defaultValue: 'Prodotti da avvisare quando disponibili',
      })}
      icon={<ReminderIcon className={ICON} />}
      count={summary?.totalCount}
    />
  );
}

export function TimeCompareWidget({ lang }: UtilWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const { skus: compareSkus } = useCompareList();
  const mounted = useMounted();
  if (!mounted || !isAuthorized || compareSkus.length === 0) return null;
  return (
    <UtilIconLink
      href={`/${lang}${ROUTES.PRODUCT_COMPARE}`}
      title={t('text-compare-tooltip', {
        defaultValue: 'Confronta prodotti fianco a fianco',
      })}
      icon={<HiOutlineSwitchHorizontal className={ICON} />}
      count={compareSkus.length}
    />
  );
}

export function TimeNoPriceWidget({ lang }: UtilWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized, hidePrices, toggleHidePrices } = useUI();
  const mounted = useMounted();
  if (!mounted || !isAuthorized) return null;
  return (
    <button
      type="button"
      onClick={toggleHidePrices}
      className={ICON_BTN}
      title={
        hidePrices
          ? t('text-show-prices-tooltip', {
              defaultValue: 'Clicca per mostrare i prezzi dei prodotti',
            })
          : t('text-hide-prices-tooltip', {
              defaultValue: 'Clicca per nascondere i prezzi dei prodotti',
            })
      }
    >
      {hidePrices ? (
        <HiOutlineEyeOff className={ICON} />
      ) : (
        <HiOutlineEye className={ICON} />
      )}
    </button>
  );
}

export function TimeProfileWidget({ config, lang }: UtilWidgetProps) {
  const { t } = useTranslation(lang, 'common');
  const { isAuthorized } = useUI();
  const router = useRouter();
  const mounted = useMounted();
  if (!mounted) return null;
  // Logged-out: reuse the shared widget's SSO/login flow unchanged.
  if (!isAuthorized) return <ProfileWidget config={config} lang={lang} />;
  return (
    <button
      type="button"
      onClick={() => router.push(`/${lang}/account/profile`)}
      className="hidden lg:inline-flex h-9 w-9 items-center justify-center text-[var(--time-gray-500)] hover:text-[var(--time-red)] transition-colors"
      title={t('text-account-tooltip', {
        defaultValue: 'Gestisci il tuo profilo e le impostazioni',
      })}
    >
      <HiOutlineUserCircle className="h-[21px] w-[21px]" />
    </button>
  );
}
