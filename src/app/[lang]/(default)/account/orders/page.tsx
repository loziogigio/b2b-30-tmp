// app/[lang]/account/orders/page.tsx
import { Suspense } from 'react';
import OrderPageClient from './order-client';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <Suspense fallback={null}>
      <OrderPageClient lang={(lang ?? 'en').toLowerCase()} />
    </Suspense>
  );
}
