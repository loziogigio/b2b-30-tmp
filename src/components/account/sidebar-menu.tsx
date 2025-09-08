'use client';

import cn from 'classnames';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

type MenuItem = { label: string; href: (lang: string) => string; match: (pathname: string) => boolean };

const MENU: MenuItem[] = [
  { label: 'Profile',          href: (l) => `/${l}/account/profile`,          match: (p) => /\/account\/profile(?:$|\/)/.test(p) },
  { label: 'Change Password',  href: (l) => `/${l}/account/change-password`,   match: (p) => /\/account\/change-password(?:$|\/)/.test(p) },
  { label: 'My Documents',     href: (l) => `/${l}/account/documents`,         match: (p) => /\/account\/documents(?:$|\/)/.test(p) },
  { label: 'My Orders',        href: (l) => `/${l}/account/orders`,            match: (p) => /\/account\/orders(?:$|\/)/.test(p) },
  // { label: 'Downloads',        href: (l) => `/${l}/account/downloads`,         match: (p) => /\/account\/downloads(?:$|\/)/.test(p) },
  { label: 'Deadlines',        href: (l) => `/${l}/account/deadlines`,         match: (p) => /\/account\/deadlines(?:$|\/)/.test(p) },
  { label: 'Fido',             href: (l) => `/${l}/account/fido`,              match: (p) => /\/account\/fido(?:$|\/)/.test(p) },
  { label: 'Need Help',        href: (l) => `/${l}/account/need-help`,         match: (p) => /\/account\/need-help(?:$|\/)/.test(p) },
];

export default function SidebarMenu() {
  const pathname = usePathname();
  const params = useParams<{ lang?: string }>();
  const lang = (params?.lang as string) || 'en';

  return (
    <nav className="rounded-2xl bg-white p-2 shadow-sm">
      <ul className="space-y-1">
        {MENU.map((item) => {
          const href = item.href(lang);
          const isActive = item.match(pathname || '');
          return (
            <li key={item.label}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'block rounded-xl px-4 py-2 text-sm hover:bg-gray-50',
                  isActive
                    ? 'border-l-4 border-teal-500 bg-teal-50/70 font-medium text-gray-900'
                    : 'text-gray-700'
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t pt-2">
        {/* TODO: hook this to your auth sign-out */}
        <Link
          href={`/${lang}/logout`}
          className="block w-full rounded-xl px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          Logout
        </Link>
      </div>
    </nav>
  );
}
