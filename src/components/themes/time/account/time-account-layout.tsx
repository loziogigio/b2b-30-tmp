'use client';

import { useSelectedLayoutSegments, useParams } from 'next/navigation';
import TimeAccountSidebar from './time-account-sidebar';

export default function TimeAccountLayout({
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
      <main className="min-h-screen bg-[var(--time-gray-50)] py-8 font-[var(--font-body)]">
        <div className="mx-auto w-full max-w-5xl px-4">{children}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--time-gray-50)] font-[var(--font-body)]">
      <style>{`
        @keyframes timeAccountFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .time-account-animate {
          animation: timeAccountFadeUp 0.35s ease both;
        }
      `}</style>
      <div className="flex gap-6 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)]">
        <div className="hidden lg:block">
          <TimeAccountSidebar lang={lang} />
        </div>
        <div className="flex-1 min-w-0 time-account-animate py-5">
          {children}
        </div>
      </div>
    </main>
  );
}
