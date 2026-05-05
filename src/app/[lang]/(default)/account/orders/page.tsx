// app/[lang]/account/orders/page.tsx
import { Suspense } from 'react';
import OrderPageClient from './order-client';
import { isTimeThemeFromRequest } from '@/lib/theme/server';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (await isTimeThemeFromRequest()) {
    const { default: TimeOrders } = await import(
      '@/components/themes/time/account/time-account-orders'
    );
    return (
      <Suspense fallback={null}>
        <TimeOrders />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <OrderPageClient lang={(lang ?? 'en').toLowerCase()} />
    </Suspense>
  );
}
