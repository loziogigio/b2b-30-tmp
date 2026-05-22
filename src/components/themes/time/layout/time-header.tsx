'use client';

import { useState, useEffect } from 'react';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { DEFAULT_HEADER_CONFIG } from '@/lib/home-settings/defaults';
import { useFixedRowOffsets } from '@/hooks/use-fixed-row-offsets';
import { TimeHeaderRowRenderer } from './time-header-row-renderer';

interface TimeHeaderProps {
  lang: string;
}

export default function TimeHeader({ lang }: TimeHeaderProps) {
  const { settings } = useHomeSettings();
  const headerConfig = settings?.headerConfig || DEFAULT_HEADER_CONFIG;
  const rows = headerConfig.rows;

  const { offsets, setRowRef } = useFixedRowOffsets(rows);

  const [isElevated, setIsElevated] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsElevated(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bottom-most pinned row carries the elevation shadow (the header box itself
  // generates no shadow once it is display:contents).
  const lastFixedRowId = [...rows]
    .reverse()
    .find((r) => r.enabled && r.fixed)?.id;

  // `contents`: the <header> keeps banner semantics but generates no box, so
  // each row's containing block is the tall page column and sticky fixed rows
  // stay pinned for the whole scroll while non-fixed rows scroll away.
  return (
    <header className="contents">
      {rows.map((row, index) => (
        <TimeHeaderRowRenderer
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
  );
}
