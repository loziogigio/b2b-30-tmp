'use client';

import cn from 'classnames';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'src/app/i18n/client';

type MenuItem = {
  labelKey: string;
  href: (lang: string) => string;
  match: (pathname: string) => boolean;
};

const MENU: MenuItem[] = [
  {
    labelKey: 'text-profile',
    href: (l) => `/${l}/account/profile`,
    match: (p) => /\/account\/profile(?:$|\/)/.test(p),
  },
  {
    labelKey: 'text-change-password',
    href: (l) => `/${l}/account/change-password`,
    match: (p) => /\/account\/change-password(?:$|\/)/.test(p),
  },
  {
    labelKey: 'text-my-documents',
    href: (l) => `/${l}/account/documents`,
    match: (p) => /\/account\/documents(?:$|\/)/.test(p),
  },
  {
    labelKey: 'text-my-orders',
    href: (l) => `/${l}/account/orders`,
    match: (p) => /\/account\/orders(?:$|\/)/.test(p),
  },
  {
    labelKey: 'text-deadlines',
    href: (l) => `/${l}/account/deadlines`,
    match: (p) => /\/account\/deadlines(?:$|\/)/.test(p),
  },
  {
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
  const router = useRouter();
  const { unauthorize } = useUI();

  function handleLogout() {
    try {
      // Remove auth token
      Cookies.remove('auth_token');
      // Clear persisted app state that should reset on logout
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem('erp-static');
        } catch {}
        try {
          window.localStorage.removeItem('likes-state');
        } catch {}
      }
    } catch {}
    // Update UI auth state and redirect to home
    unauthorize?.();
    router.replace(`/${lang}`);
  }

  return (
    <nav className="rounded-2xl bg-white p-2 shadow-sm">
      <ul className="space-y-1">
        {MENU.map((item) => {
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
          className="block w-full rounded-xl px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          {t('text-logout')}
        </button>
      </div>
    </nav>
  );
}
