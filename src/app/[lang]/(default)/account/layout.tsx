// app/[lang]/account/layout.tsx
'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import SidebarMenu from '@components/account/sidebar-menu';
import WalletPoints from '@components/account/wallet-points';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  // Segments inside /[lang]/account/*
  const segments = useSelectedLayoutSegments();
  const hideSidebar = segments.includes('order-detail');

  if (hideSidebar) {
    // Standalone page without sidebar
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="mx-auto w-full max-w-5xl px-4">{children}</div>
      </main>
    );
  }

  // Default: account chrome with sidebar
  return (
    <main className="min-h-screen bg-gray-100 pb-4">
      <div className="mx-auto max-w-[1920px] pt-6 md:px-6 lg:px-8 2xl:px-10">
        <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-6">
            <WalletPoints />
            <SidebarMenu />
          </div>
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
