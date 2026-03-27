import { Suspense } from 'react';
import DocumentsClient from './documents-client';
import { isTimeTheme } from '@/lib/theme/resolver';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (isTimeTheme()) {
    const { default: TimeDocs } = await import(
      '@/components/themes/time/account/time-account-documents'
    );
    return (
      <Suspense fallback={null}>
        <TimeDocs lang={(lang ?? 'en').toLowerCase()} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <DocumentsClient lang={(lang ?? 'en').toLowerCase()} />
    </Suspense>
  );
}
