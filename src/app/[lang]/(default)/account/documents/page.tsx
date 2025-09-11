import { Suspense } from 'react';
import DocumentsClient from './documents-client';

export default function Page({ params: { lang } }: { params: { lang: string } }) {
  return (
    <Suspense fallback={null}>
      <DocumentsClient lang={(lang ?? 'en').toLowerCase()} />
    </Suspense>
  );
}
