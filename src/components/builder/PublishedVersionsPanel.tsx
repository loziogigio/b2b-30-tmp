'use client';
import {
  pageBuilderActions,
  usePageBuilderStore,
} from '@/lib/store/pageBuilderStore';

const TagBadge = ({ label }: { label: string }) => (
  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
    {label}
  </span>
);

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleString();
  } catch {
    return String(value);
  }
};

export default function PublishedVersionsPanel() {
  const { versions, loading } = usePageBuilderStore((state) => ({
    versions: state.versions,
    loading: state.loading,
  }));

  if (loading && versions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading versions…
      </div>
    );
  }

  if (!versions.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No versions found for this page. Create or publish a version from the
        builder to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versions.map((version) => (
        <div
          key={version.version}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Version {version.version}{' '}
                {version.isDefault ? (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    DEFAULT
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500">
                Status: {version.status} • Updated{' '}
                {formatDate(version.lastSavedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => pageBuilderActions.openPublishModal(version)}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
            >
              Publish / Edit
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-slate-100 p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Campaign
              </p>
              <p className="font-medium text-slate-800">
                {version.tags?.campaign ?? '—'}
              </p>
            </div>
            <div className="rounded border border-slate-100 p-3 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Segment
              </p>
              <p className="font-medium text-slate-800">
                {version.tags?.segment ?? '—'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {version.tags?.attributes
              ? Object.entries(version.tags.attributes).map(([key, value]) =>
                  value ? (
                    <TagBadge key={key}>{`${key}: ${value}`}</TagBadge>
                  ) : null,
                )
              : null}
            <TagBadge label={`Priority: ${version.priority ?? 0}`} />
            {version.activeFrom ? (
              <TagBadge label={`From ${formatDate(version.activeFrom)}`} />
            ) : null}
            {version.activeTo ? (
              <TagBadge label={`To ${formatDate(version.activeTo)}`} />
            ) : null}
            <TagBadge label={`Blocks: ${version.blocksCount ?? 0}`} />
          </div>

          {version.comment ? (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {version.comment}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
