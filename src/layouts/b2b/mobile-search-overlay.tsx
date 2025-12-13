'use client';

import { useState } from 'react';
import { useUI } from '@contexts/ui.context';
import SearchOverlayB2B from '@components/search/search-overlay-b2b';
import useFreezeBodyScroll from '@utils/use-freeze-body-scroll';

interface Props {
  lang: string;
}

export default function MobileSearchOverlay({ lang }: Props) {
  const { displayMobileSearch, closeMobileSearch } = useUI();
  const [searchText, setSearchText] = useState('');

  // Freeze body scroll when mobile search is open
  useFreezeBodyScroll(displayMobileSearch);

  const RECENT_KEY = 'b2b-recent-searches';
  function pushRecent(term: string) {
    const t = term.trim();
    if (!t) return;
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [t, ...arr.filter((x) => x !== t)].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function handleChange(e: React.FormEvent<HTMLInputElement>) {
    setSearchText(e.currentTarget.value);
  }

  function handleClear() {
    setSearchText('');
    closeMobileSearch();
  }

  function handleClose() {
    closeMobileSearch();
  }

  // Only render on mobile (lg:hidden equivalent - component is only shown when displayMobileSearch is true)
  if (!displayMobileSearch) return null;

  return (
    <div className="lg:hidden">
      <SearchOverlayB2B
        lang={lang}
        open={displayMobileSearch}
        onClose={handleClose}
        value={searchText}
        onChange={handleChange}
        onClear={handleClear}
        onSubmitSuccess={() => {
          pushRecent(searchText);
          closeMobileSearch();
        }}
      />
    </div>
  );
}
