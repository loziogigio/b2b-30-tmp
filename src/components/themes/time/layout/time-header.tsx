'use client';

import { useState, useEffect } from 'react';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { DEFAULT_HEADER_CONFIG } from '@/lib/home-settings/defaults';
import {
  usePimMenuQuery,
  type MenuTreeNode,
} from '@framework/product/get-pim-menu';
import { slugify } from '@utils/slugify';
import Link from '@components/ui/link';
import cn from 'classnames';
import { TimeHeaderRowRenderer } from './time-header-row-renderer';

interface TimeHeaderProps {
  lang: string;
}

export default function TimeHeader({ lang }: TimeHeaderProps) {
  const { settings } = useHomeSettings();
  const headerConfig = settings?.headerConfig || DEFAULT_HEADER_CONFIG;

  const [isElevated, setIsElevated] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Fetch categories from PIM menu
  const { data: menuData } = usePimMenuQuery({
    location: 'header',
    staleTime: 5 * 60 * 1000,
  });
  const categories: MenuTreeNode[] = menuData?.tree ?? [];

  useEffect(() => {
    const handleScroll = () => setIsElevated(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Dynamic Header Rows */}
      <header
        className={cn(
          'bg-white sticky top-0 z-[100] transition-shadow',
          isElevated && 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        )}
      >
        {headerConfig.rows.map((row, index) => (
          <TimeHeaderRowRenderer
            key={row.id}
            row={row}
            lang={lang}
            isFirstRow={index === 0}
          />
        ))}
      </header>

      {/* Category Navigation Bar */}
      {categories.length > 0 && (
        <nav className="hidden md:flex bg-white border-b border-[var(--time-gray-100)]">
          <div
            className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center gap-0 overflow-x-auto w-full"
            style={{ scrollbarWidth: 'none' }}
          >
            {categories.map((cat) => {
              const catId = String(cat.id || cat.name);
              const catSlug = cat.slug || slugify(cat.name || cat.label || '');
              const catPath = cat.path?.length
                ? `/${lang}/category/${cat.path.join('/')}`
                : `/${lang}/category/${catSlug}`;
              const isActive = activeCat === catId;

              return (
                <Link
                  key={catId}
                  href={catPath}
                  onMouseEnter={() => setActiveCat(catId)}
                  onMouseLeave={() => setActiveCat(null)}
                  className={cn(
                    'px-5 py-3.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-all font-[family-name:var(--font-body)]',
                    isActive
                      ? 'border-[var(--time-red)] text-[var(--time-red)] font-bold'
                      : 'border-transparent text-[var(--time-gray-600)] hover:text-[var(--time-dark)]',
                  )}
                >
                  {cat.name || cat.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
