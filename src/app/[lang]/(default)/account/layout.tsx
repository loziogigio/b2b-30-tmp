// app/[lang]/account/layout.tsx
'use client';

import { isTimeTheme } from '@/lib/theme/resolver';
import dynamic from 'next/dynamic';

const TimeAccountLayout = dynamic(
  () => import('@/components/themes/time/account/time-account-layout'),
);
const DefaultAccountLayout = dynamic(
  () => import('@/components/themes/default/account/default-account-layout'),
);

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const Layout = isTimeTheme() ? TimeAccountLayout : DefaultAccountLayout;
  return <Layout>{children}</Layout>;
}
