'use client';
import { ProductB2BSearch } from '@components/product/product-b2b-search';
import CategoryScrollFilter from '@components/search/category-scroll-filter';
import { SearchFiltersB2B } from '@components/search/filters-b2b';
import SearchTopBar from '@components/search/search-top-bar';
import Container from '@components/ui/container';
import { Element } from 'react-scroll';
import SearchTabs from '@components/search/search-tabs';

export default function SearchB2BPageContent({ lang }: { lang: string }) {
  return (
    <Container>
      {/* Static horizontal filter */}
      <CategoryScrollFilter lang={lang} />
      <SearchTabs lang={lang} />
      <Element name="grid" className="flex pb-16 pt-7 lg:pt-7 lg:pb-20">
        <div className="sticky hidden h-full lg:pt-4 shrink-0 ltr:pr-8 rtl:pl-8 xl:ltr:pr-16 xl:rtl:pl-16 lg:block w-80 xl:w-96 top-16">
          <SearchFiltersB2B lang={lang} />
        </div>
        <div className="w-full lg:pt-4 lg:ltr:-ml-4 lg:rtl:-mr-2 xl:ltr:-ml-8 xl:rtl:-mr-8 lg:-mt-1">
          {/* <SearchTopBar lang={lang} /> */}
          <ProductB2BSearch lang={lang} />
        </div>
      </Element>
    </Container>
  );
}
