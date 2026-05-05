'use client';

import { useSelectedLayoutSegments, useParams } from 'next/navigation';
import SidebarMenu from '@components/account/sidebar-menu';

export default function DefaultAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ lang?: string }>();
  const lang = (params?.lang as string) || 'it';
  const hideSidebar = segments.includes('order-detail');

  if (hideSidebar) {
    return (
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="mx-auto w-full max-w-5xl px-4">{children}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 pb-4">
      <div className="mx-auto max-w-[1600px] pt-6 px-5">
        <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-6">
            <SidebarMenu lang={lang} />
          </div>
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
