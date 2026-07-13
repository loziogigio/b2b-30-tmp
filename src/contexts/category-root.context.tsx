'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_CATEGORY_ROOT,
  categoryRootFor,
  normalizeCategoryRootMap,
  type CategoryRootMap,
} from '@/lib/seo/category-root';

const CategoryRootContext = createContext<CategoryRootMap>({
  default: DEFAULT_CATEGORY_ROOT,
});
CategoryRootContext.displayName = 'CategoryRootContext';

export function CategoryRootProvider({
  categoryRoots,
  children,
}: {
  categoryRoots: CategoryRootMap;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => normalizeCategoryRootMap(categoryRoots),
    [categoryRoots],
  );
  return (
    <CategoryRootContext.Provider value={value}>
      {children}
    </CategoryRootContext.Provider>
  );
}

/** Read the server-resolved public category root without a browser fetch. */
export function useCategoryRoot(lang: string): string {
  return categoryRootFor(useContext(CategoryRootContext), lang);
}

export function useCategoryRootMap(): CategoryRootMap {
  return useContext(CategoryRootContext);
}
