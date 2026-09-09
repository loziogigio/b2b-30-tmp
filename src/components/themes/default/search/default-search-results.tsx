'use client';

import React from 'react';
import { Element } from 'react-scroll';
import { ProductB2BSearch } from '@components/product/product-b2b-search';
import { SearchFiltersB2B } from '@components/search/filters-b2b';
import SearchFilterDrawer from '@components/search/search-filter-drawer';

/**
 * The facet sidebar + product grid, shared by the search page and the
 * collection page. See the time-theme twin for why this lives in one place.
 */
export default function DefaultSearchResults({
  lang,
  text,
  collectionSlug,
  header,
}: {
  lang: string;
  text?: string;
  collectionSlug?: string;
  /** Content-column chrome above the grid — see the time-theme twin. */
  header?: React.ReactNode;
}) {
  const filters = (
    <SearchFiltersB2B lang={lang} text={text} collectionSlug={collectionSlug} />
  );

  return (
    <Element name="grid" className="flex pb-16 pt-7 lg:pt-7 lg:pb-20">
      <div className="sticky hidden h-full lg:pt-4 shrink-0 ltr:pr-8 rtl:pl-8 xl:ltr:pr-16 xl:rtl:pl-16 lg:block w-80 xl:w-96 top-16">
        {filters}
      </div>
      <div className="w-full lg:pt-4 lg:ltr:-ml-4 lg:rtl:-mr-2 xl:ltr:-ml-8 xl:rtl:-mr-8 lg:-mt-1">
        {header}
        <SearchFilterDrawer lang={lang}>{filters}</SearchFilterDrawer>
        <ProductB2BSearch lang={lang} collectionSlug={collectionSlug} />
      </div>
    </Element>
  );
}
