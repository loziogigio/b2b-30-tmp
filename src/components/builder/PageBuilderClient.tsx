'use client';

import { useEffect, useState } from 'react';
import {
  pageBuilderActions,
  usePageBuilderStore,
} from '@/lib/store/pageBuilderStore';
import PublishedVersionsPanel from './PublishedVersionsPanel';
import PublishModal from './PublishModal';

interface PageBuilderClientProps {
  initialSlug?: string;
}

const InputLabel = ({ label }: { label: string }) => (
  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
    {label}
  </label>
);

export default function PageBuilderClient({
  initialSlug = 'home',
}: PageBuilderClientProps) {
  const { slug, loading, error } = usePageBuilderStore((state) => ({
    slug: state.slug,
    loading: state.loading,
    error: state.error,
  }));
  const [pendingSlug, setPendingSlug] = useState(initialSlug);

  useEffect(() => {
    pageBuilderActions.initialize(initialSlug);
    pageBuilderActions.fetchVersions(initialSlug).catch(() => {});
  }, [initialSlug]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    pageBuilderActions.setSlug(pendingSlug);
    await pageBuilderActions.fetchVersions(pendingSlug);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <InputLabel label="Page slug" />
            <input
              type="text"
              value={pendingSlug}
              onChange={(event) => setPendingSlug(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="e.g. home, product-detail"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Load Page'}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {!error && slug ? (
          <p className="mt-3 text-xs text-slate-500">
            Viewing versions for{' '}
            <span className="font-medium text-slate-700">{slug}</span>
          </p>
        ) : null}
      </div>

      <PublishedVersionsPanel />
      <PublishModal />
    </div>
  );
}
