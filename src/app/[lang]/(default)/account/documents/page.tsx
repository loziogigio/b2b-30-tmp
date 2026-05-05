import { Suspense } from 'react';
import DocumentsClient from './documents-client';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
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
