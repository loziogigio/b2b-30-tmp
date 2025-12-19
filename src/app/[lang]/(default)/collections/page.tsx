import { Suspense } from 'react';
import Divider from '@components/ui/divider';
import CollectionPageContent from './collection-page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collection',
};

function CollectionFallback() {
  return <>Loading...</>;
}

export default async function Page({ params }: { params: any }) {
  const { lang } = await params;

  return (
    <>
      <Divider />
      <Suspense fallback={<CollectionFallback />}>
        <CollectionPageContent lang={lang} />
      </Suspense>
    </>
  );
}
