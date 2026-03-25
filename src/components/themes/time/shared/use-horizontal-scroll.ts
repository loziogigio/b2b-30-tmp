'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseHorizontalScrollOptions {
  scrollAmount?: number;
}

export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseHorizontalScrollOptions = {},
) {
  const { scrollAmount = 300 } = options;
  const scrollRef = useRef<T>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  const scroll = useCallback(
    (dir: number) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    },
    [scrollAmount, checkScroll],
  );

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    scrollLeft: () => scroll(-1),
    scrollRight: () => scroll(1),
  };
}
