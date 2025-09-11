// app/[lang]/account/orders/page.tsx
import { Suspense } from 'react';
import OrderPageClient from './order-client';

export default function Page({ params: { lang } }: { params: { lang: string } }) {
  return (
    <Suspense fallback={null}>
      <OrderPageClient lang={(lang ?? 'en').toLowerCase()} />
    </Suspense>
  );
}
