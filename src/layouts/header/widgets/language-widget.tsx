'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { HiOutlineGlobeAlt, HiChevronDown } from 'react-icons/hi';
import type { WidgetConfig } from '@/lib/home-settings/types';
import type { EnabledLanguage } from '@/app/api/b2b/languages/route';

interface LanguageWidgetProps {
  config: WidgetConfig;
  lang: string;
}

// In-memory cache shared across widget instances/renders so the enabled
// languages are fetched once per page load (they change very rarely).
let languagesCache: Promise<EnabledLanguage[]> | null = null;

function loadEnabledLanguages(): Promise<EnabledLanguage[]> {
  if (!languagesCache) {
    languagesCache = fetch('/api/b2b/languages')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => (Array.isArray(data) ? (data as EnabledLanguage[]) : []))
      .catch(() => []);
  }
  return languagesCache;
}

export function LanguageWidget({ config, lang }: LanguageWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [languages, setLanguages] = useState<EnabledLanguage[]>([]);

  useEffect(() => {
    let active = true;
    loadEnabledLanguages().then((langs) => {
      if (active) setLanguages(langs);
    });
    return () => {
      active = false;
    };
  }, []);

  // Build the URL for a target language by swapping the `/[lang]/…` segment
  // while preserving the rest of the path and the query string.
  const buildHref = (code: string) => {
    const segments = (pathname || `/${lang}`).split('/');
    if (segments.length > 1) segments[1] = code;
    const path = segments.join('/') || `/${code}`;
    const qs = searchParams?.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const changeLanguage = (code: string) => {
    if (code === lang) return;
    // Persist for middleware/SSR locale resolution, then navigate.
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    router.push(buildHref(code));
  };

  // Hide entirely when there are fewer than two languages to switch between.
  if (languages.length < 2) return null;

  const current = languages.find((l) => l.code === lang.toLowerCase()) ?? null;
  const currentLabel = (current?.code ?? lang).toUpperCase();

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        className="inline-flex items-center gap-1.5 rounded-full border border-border-base px-3 py-1.5 text-sm font-medium text-brand-dark transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        title={current?.nativeName || current?.name || currentLabel}
      >
        <HiOutlineGlobeAlt className="h-4 w-4" />
        <span>{currentLabel}</span>
        {config?.showLabel && current?.nativeName && (
          <span className="hidden lg:inline">{current.nativeName}</span>
        )}
        <HiChevronDown className="h-4 w-4 opacity-60" />
      </MenuButton>

      <MenuItems
        anchor={{ to: 'bottom end', gap: 8 }}
        className="z-[100] min-w-[10rem] overflow-hidden rounded-md border border-border-base bg-white shadow-lg focus:outline-none"
      >
        {languages.map((l) => {
          const active = l.code === lang.toLowerCase();
          return (
            <MenuItem key={l.code}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={() => changeLanguage(l.code)}
                  className={[
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors',
                    focus ? 'bg-gray-50' : '',
                    active ? 'font-semibold text-brand' : 'text-brand-dark',
                  ].join(' ')}
                >
                  <span>{l.nativeName || l.name || l.code.toUpperCase()}</span>
                  <span className="text-xs uppercase text-gray-400">
                    {l.code}
                  </span>
                </button>
              )}
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
