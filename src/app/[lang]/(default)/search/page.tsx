import { Suspense } from 'react';
import DownloadApps from '@components/common/download-apps';
import Divider from '@components/ui/divider';
import SearchB2BPageContent from './search-b2b-page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
};

function SearchBarFallback() {
  return <>Loading...</>;
}

export default async function Page({ params }: { params: any }) {
  const { lang } = await params;

  return (
    <>
      <Divider />
      <Suspense fallback={<SearchBarFallback />}>
        <SearchB2BPageContent lang={lang} />
      </Suspense>
      <DownloadApps lang={lang} />
    </>
  );
}
