'use client';

import cn from 'classnames';
import { useAccountSettings } from '@/hooks/use-account-settings';
import { isAccountSectionVisible } from '@/lib/erp/account-config.types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'src/app/i18n/client';
import { useLogoutMutation } from '@framework/auth/use-logout';

type MenuItem = {
  /** Section id shared with the time theme, used by the account_settings flags. */
  id: string;
  labelKey: string;
  href: (lang: string) => string;
  match: (pathname: string) => boolean;
};

const MENU: MenuItem[] = [
  {
    id: 'profile',
    labelKey: 'text-profile',
    href: (l) => `/${l}/account/profile`,
    match: (p) => /\/account\/profile(?:$|\/)/.test(p),
  },
  {
    id: 'password',
    labelKey: 'text-change-password',
    href: (l) => `/${l}/account/change-password`,
    match: (p) => /\/account\/change-password(?:$|\/)/.test(p),
  },
  {
    id: 'documents',
    labelKey: 'text-my-documents',
    href: (l) => `/${l}/account/documents`,
    match: (p) => /\/account\/documents(?:$|\/)/.test(p),
  },
  {
    id: 'orders',
    labelKey: 'text-my-orders',
    href: (l) => `/${l}/account/orders`,
    match: (p) => /\/account\/orders(?:$|\/)/.test(p),
  },
  {
    id: 'deadlines',
    labelKey: 'text-deadlines',
    href: (l) => `/${l}/account/deadlines`,
    match: (p) => /\/account\/deadlines(?:$|\/)/.test(p),
  },
  {
    id: 'fido',
    labelKey: 'text-fido',
    href: (l) => `/${l}/account/fido`,
    match: (p) => /\/account\/fido(?:$|\/)/.test(p),
  },
];

interface SidebarMenuProps {
  lang: string;
}

export default function SidebarMenu({ lang }: SidebarMenuProps) {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname();
  const { settings: accountSettings } = useAccountSettings();
  const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation(lang);

  function handleLogout() {
    logout();
  }

  return (
    <nav className="rounded-2xl bg-white p-2 shadow-sm">
      <ul className="space-y-1">
        {MENU.filter((item) =>
          isAccountSectionVisible(item.id, accountSettings),
        ).map((item) => {
          const href = item.href(lang);
          const isActive = item.match(pathname || '');
          return (
            <li key={item.labelKey}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded-xl px-4 py-2 text-sm hover:bg-gray-50',
                  isActive
                    ? 'border-l-4 border-teal-500 bg-teal-50/70 font-medium text-gray-900'
                    : 'text-gray-700',
                )}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t pt-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="block w-full rounded-xl px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isLoggingOut ? '...' : t('text-logout')}
        </button>
      </div>
    </nav>
  );
}
