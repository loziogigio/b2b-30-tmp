import { Suspense } from 'react';
import Divider from '@components/ui/divider';
import CollectionDetailContent from './collection-detail-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collection',
};

function CollectionFallback() {
  return <>Loading...</>;
}

export default async function Page({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  const { lang, slug } = await params;

  return (
    <>
      <Divider />
      <Suspense fallback={<CollectionFallback />}>
        <CollectionDetailContent lang={lang} slug={slug} />
      </Suspense>
    </>
  );
}
