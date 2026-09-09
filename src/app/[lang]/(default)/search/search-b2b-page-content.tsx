'use client';
import CategoryScrollFilter from '@components/search/category-scroll-filter';
import DefaultSearchResults from '@components/themes/default/search/default-search-results';
import Container from '@components/ui/container';
import SearchTabs from '@components/search/search-tabs';
import { useSearchParams } from 'next/navigation';

export default function SearchB2BPageContent({ lang }: { lang: string }) {
  const searchParams = useSearchParams();
  const text = searchParams?.get('text') || undefined;

  return (
    <Container>
      {/* Static horizontal filter */}
      <CategoryScrollFilter lang={lang} />
      <SearchTabs lang={lang} />
      <DefaultSearchResults lang={lang} text={text} />
    </Container>
  );
}
