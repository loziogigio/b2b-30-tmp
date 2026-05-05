// app/[lang]/account/layout.tsx
'use client';

import { useThemeId } from '@/contexts/tenant.context';
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
  const Layout =
    useThemeId() === 'time' ? TimeAccountLayout : DefaultAccountLayout;
  return <Layout>{children}</Layout>;
}
