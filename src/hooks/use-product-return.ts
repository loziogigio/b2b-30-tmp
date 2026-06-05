'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/routes';

/**
 * Shared "return" navigation for product detail pages. Goes back in browser
 * history when the user arrived from another in-app page; falls back to the
 * products catalog when there's no history to go back to (direct link / new
 * tab). Both themes render their own styled button over this single behavior.
 */
export function useProductReturn(lang: string) {
  const router = useRouter();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${lang}${ROUTES.PRODUCTS}`);
    }
  }, [router, lang]);
}
