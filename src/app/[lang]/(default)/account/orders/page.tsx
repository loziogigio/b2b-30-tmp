// app/[lang]/account/orders/page.tsx
import { Suspense } from 'react';
import OrderPageClient from './order-client';
import { isTimeTheme } from '@/lib/theme/resolver';

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (isTimeTheme()) {
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
