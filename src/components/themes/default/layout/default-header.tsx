'use client';

import { useEffect, useState } from 'react';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { DEFAULT_HEADER_CONFIG } from '@/lib/home-settings/defaults';
import { DefaultHeaderRowRenderer } from './default-header-row-renderer';
import { useTranslation } from 'src/app/i18n/client';
import { HiOutlineArrowUp } from 'react-icons/hi';
import cn from 'classnames';

interface DefaultHeaderProps {
  lang: string;
}

export default function DefaultHeader({ lang }: DefaultHeaderProps) {
  const { t } = useTranslation(lang, 'common');
  const { settings } = useHomeSettings();
  const headerConfig = settings?.headerConfig || DEFAULT_HEADER_CONFIG;

  const [isElevated, setIsElevated] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || 0;
      setIsElevated(y > 10);
      setShowScrollTop(y > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={cn(
          'bg-white sticky top-0 z-[100] transition-shadow',
          isElevated && 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        )}
      >
        {headerConfig.rows.map((row, index) => (
          <DefaultHeaderRowRenderer
            key={row.id}
            row={row}
            lang={lang}
            isFirstRow={index === 0}
          />
        ))}
      </header>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label={t('text-scroll-to-top', {
            defaultValue: 'Scroll to top',
          })}
        >
          <HiOutlineArrowUp className="h-4 w-4" />
          <span>{t('text-top', { defaultValue: 'Top' })}</span>
        </button>
      )}
    </>
  );
}
