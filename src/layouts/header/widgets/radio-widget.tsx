'use client';

import { useEffect } from 'react';
import { HiOutlineRadio } from 'react-icons/hi2';
import Image from 'next/image';
import type { WidgetConfig } from '@/lib/home-settings/types';

interface RadioWidgetProps {
  config: WidgetConfig;
  lang: string;
}

export function RadioWidget({ config }: RadioWidgetProps) {
  // Show radio by default unless explicitly disabled (enabled === false)
  if (config?.enabled === false) return null;

  const headerIcon = config?.headerIcon;
  const stations = config?.stations;

  // Store stations in localStorage so the popup can read them
  useEffect(() => {
    if (stations && stations.length > 0) {
      localStorage.setItem('radioStations', JSON.stringify(stations));
    }
  }, [stations]);

  const handleOpenRadio = () => {
    window.open(
      '/radio-player.html',
      'RadioPlayer',
      'width=450,height=500,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no',
    );
  };

  // Hide when bottom navigation is visible (below lg breakpoint)
  return (
    <button
      type="button"
      onClick={handleOpenRadio}
      className="hidden lg:flex shrink-0 items-center justify-center h-9 w-9 rounded-full border border-slate-200 hover:border-brand hover:text-brand text-slate-600 transition-colors cursor-pointer overflow-hidden"
      aria-label="Ascolta la radio"
      title="Ascolta la radio"
    >
      {headerIcon ? (
        <Image
          src={headerIcon}
          alt="Radio"
          width={36}
          height={36}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <HiOutlineRadio className="h-5 w-5" />
      )}
    </button>
  );
}
