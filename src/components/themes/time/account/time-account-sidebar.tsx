'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useLogoutMutation } from '@framework/auth/use-logout';
import { useCustomerQuery } from '@framework/acccount/fetch-account';
import {
  IconGrid,
  IconUser,
  IconPackage,
  IconFile,
  IconCoins,
  IconCalendar,
  IconLock,
  IconLogout,
} from './time-account-icons';

type NavItem = {
  id: string;
  labelKey: string;
  href: (lang: string) => string;
  match: (p: string) => boolean;
  icon: React.ComponentType;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'text-dashboard',
    href: (l) => `/${l}/account`,
    match: (p) => /\/account\/?$/.test(p) || /\/account\/profile/.test(p),
    icon: IconGrid,
  },
  {
    id: 'orders',
    labelKey: 'text-my-orders',
    href: (l) => `/${l}/account/orders`,
    match: (p) => /\/account\/orders/.test(p),
    icon: IconPackage,
  },
  {
    id: 'documents',
    labelKey: 'text-my-documents',
    href: (l) => `/${l}/account/documents`,
    match: (p) => /\/account\/documents/.test(p),
    icon: IconFile,
  },
  {
    id: 'fido',
    labelKey: 'text-fido',
    href: (l) => `/${l}/account/fido`,
    match: (p) => /\/account\/fido/.test(p),
    icon: IconCoins,
  },
  {
    id: 'deadlines',
    labelKey: 'text-deadlines',
    href: (l) => `/${l}/account/deadlines`,
    match: (p) => /\/account\/deadlines/.test(p),
    icon: IconCalendar,
  },
  {
    id: 'password',
    labelKey: 'text-change-password',
    href: (l) => `/${l}/account/change-password`,
    match: (p) => /\/account\/change-password/.test(p),
    icon: IconLock,
  },
];

interface TimeAccountSidebarProps {
  lang: string;
}

export default function TimeAccountSidebar({ lang }: TimeAccountSidebarProps) {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname() || '';
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation(lang);
  const { data: customer } = useCustomerQuery(true);

  const displayName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      customer.businessName ||
      customer.code
    : '';
  const initials = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '';
  const company = customer?.businessName || '';
  const discountCode = customer?.discountCode || '';

  return (
    <aside className="w-[250px] shrink-0 bg-white border-r border-[var(--time-gray-100)] sticky top-16 h-[calc(100vh-64px)] overflow-y-auto flex flex-col p-4 pt-5 font-[var(--font-body)]">
      {/* User card */}
      <div className="rounded-[14px] bg-gradient-to-br from-[var(--time-dark)] to-gray-700 p-4 mb-5">
        <div className="w-11 h-11 rounded-xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center text-white text-base font-extrabold font-[var(--font-display)] mb-2.5">
          {initials}
        </div>
        <div className="text-sm font-extrabold text-white font-[var(--font-display)] mb-0.5">
          {displayName}
        </div>
        <div className="text-[11px] text-white/50 font-[var(--font-body)]">
          {company}
        </div>
        {discountCode && (
          <div className="mt-2.5 flex gap-1.5">
            <span className="text-[9px] font-bold text-white bg-[var(--time-red)] px-2 py-0.5 rounded-[5px] font-[var(--font-body)]">
              {discountCode}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href(lang)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] transition-colors text-left',
                active
                  ? 'bg-[rgba(230,57,70,0.08)] text-[var(--time-red)] font-bold'
                  : 'text-[var(--time-gray-600)] font-medium hover:bg-[var(--time-gray-50)] hover:text-[var(--time-dark)]',
              )}
            >
              <span
                className={cn('flex', active ? 'opacity-100' : 'opacity-60')}
              >
                <Icon />
              </span>
              {t(item.labelKey, { defaultValue: item.id })}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        type="button"
        onClick={() => logout()}
        disabled={isLoggingOut}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-[var(--time-gray-200)] bg-white text-[13px] font-semibold text-[var(--time-gray-600)] mt-2 hover:border-red-600 hover:text-red-600 transition-colors disabled:opacity-50"
      >
        <span className="flex">
          <IconLogout />
        </span>
        {isLoggingOut ? '...' : t('text-logout', { defaultValue: 'Esci' })}
      </button>
    </aside>
  );
}
