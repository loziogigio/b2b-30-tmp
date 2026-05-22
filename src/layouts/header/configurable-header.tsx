'use client';

import { useEffect, useState } from 'react';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { DEFAULT_HEADER_CONFIG } from '@/lib/home-settings/defaults';
import { useFixedRowOffsets } from '@/hooks/use-fixed-row-offsets';
import { HeaderRowRenderer } from './header-row-renderer';
import { useTranslation } from 'src/app/i18n/client';
import { HiOutlineArrowUp } from 'react-icons/hi';

interface ConfigurableHeaderProps {
  lang: string;
}

export function ConfigurableHeader({ lang }: ConfigurableHeaderProps) {
  const { t } = useTranslation(lang, 'common');
  const { settings } = useHomeSettings();

  // Use published headerConfig from settings, falling back to default
  const headerConfig = settings?.headerConfig || DEFAULT_HEADER_CONFIG;
  const rows = headerConfig.rows;

  const { offsets, setRowRef } = useFixedRowOffsets(rows);

  const [isElevated, setIsElevated] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Bottom-most pinned row carries the elevation shadow.
  const lastFixedRowId = [...rows]
    .reverse()
    .find((r) => r.enabled && r.fixed)?.id;

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

  // Don't show loading placeholder - render default header immediately
  // This prevents blank page while settings load

  return (
    <>
      {/* `contents`: the <header> generates no box so each row's containing
          block is the tall page column, letting fixed rows stay pinned for the
          whole scroll while non-fixed rows scroll away. */}
      <header className="contents">
        {rows.map((row, index) => (
          <HeaderRowRenderer
            key={row.id}
            row={row}
            lang={lang}
            isFirstRow={index === 0}
            stickyTop={row.fixed ? (offsets[row.id] ?? 0) : undefined}
            elevated={isElevated && row.id === lastFixedRowId}
            registerRef={setRowRef}
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

export default ConfigurableHeader;
