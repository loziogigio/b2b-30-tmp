'use client';

import dynamic from 'next/dynamic';

const PageBuilderClient = dynamic(
  () => import('@components/builder/PageBuilderClient'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading builder…
      </div>
    ),
  },
);

export default function PageBuilderPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Page Builder – Publishing
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage targeting tags, priority, and active windows for each published
          version. Use this tool after saving updates in the external builder to
          control who sees each experience.
        </p>
      </div>
      <PageBuilderClient initialSlug="home" />
    </div>
  );
}
