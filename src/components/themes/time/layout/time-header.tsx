'use client';

import { useState, useEffect } from 'react';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { DEFAULT_HEADER_CONFIG } from '@/lib/home-settings/defaults';
import cn from 'classnames';
import { TimeHeaderRowRenderer } from './time-header-row-renderer';

interface TimeHeaderProps {
  lang: string;
}

export default function TimeHeader({ lang }: TimeHeaderProps) {
  const { settings } = useHomeSettings();
  const headerConfig = settings?.headerConfig || DEFAULT_HEADER_CONFIG;

  const [isElevated, setIsElevated] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsElevated(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
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
  );
}
