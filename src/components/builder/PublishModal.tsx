'use client';

import { Dialog } from '@headlessui/react';
import {
  usePageBuilderStore,
  pageBuilderActions,
} from '@/lib/store/pageBuilderStore';

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    {children}
  </label>
);

export default function PublishModal() {
  const { isPublishModalOpen, selectedVersion, form, isPublishing } =
    usePageBuilderStore((state) => ({
      isPublishModalOpen: state.isPublishModalOpen,
      selectedVersion: state.selectedVersion,
      form: state.form,
      isPublishing: state.isPublishing,
    }));

  if (!isPublishModalOpen || !selectedVersion) {
    return null;
  }

  const handleChange = (field: string, value: string | boolean) => {
    pageBuilderActions.updateForm(field as keyof typeof form, value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await pageBuilderActions.submitPublish();
  };

  return (
    <Dialog
      open={isPublishModalOpen}
      onClose={() => pageBuilderActions.closePublishModal()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            Publish Version {selectedVersion.version}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500">
            Configure campaign targeting and scheduling before publishing.
          </Dialog.Description>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Campaign">
                <input
                  type="text"
                  value={form.campaign ?? ''}
                  onChange={(event) =>
                    handleChange('campaign', event.target.value)
                  }
                  placeholder="e.g. google-ads-winter"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
              <Field label="Segment">
                <input
                  type="text"
                  value={form.segment ?? ''}
                  onChange={(event) =>
                    handleChange('segment', event.target.value)
                  }
                  placeholder="vip, new-customer, etc."
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Region">
                <input
                  type="text"
                  value={form.region ?? ''}
                  onChange={(event) =>
                    handleChange('region', event.target.value)
                  }
                  placeholder="us-east"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
              <Field label="Language">
                <input
                  type="text"
                  value={form.language ?? ''}
                  onChange={(event) =>
                    handleChange('language', event.target.value)
                  }
                  placeholder="en, it"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Device">
                <input
                  type="text"
                  value={form.device ?? ''}
                  onChange={(event) =>
                    handleChange('device', event.target.value)
                  }
                  placeholder="mobile or desktop"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
              <Field label="Address States (Province)">
                <input
                  type="text"
                  value={form.addressStates ?? ''}
                  onChange={(event) =>
                    handleChange('addressStates', event.target.value)
                  }
                  placeholder="TO, MI, RM (comma-separated)"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Priority">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(event) =>
                    handleChange('priority', Number(event.target.value))
                  }
                  min={0}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status ?? 'published'}
                  onChange={(event) =>
                    handleChange('status', event.target.value)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Active from">
                <input
                  type="datetime-local"
                  value={form.activeFrom ?? ''}
                  onChange={(event) =>
                    handleChange('activeFrom', event.target.value)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
              <Field label="Active to">
                <input
                  type="datetime-local"
                  value={form.activeTo ?? ''}
                  onChange={(event) =>
                    handleChange('activeTo', event.target.value)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="builder-modal-default"
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  handleChange('isDefault', event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <label
                htmlFor="builder-modal-default"
                className="text-sm text-slate-600"
              >
                Set as default version
              </label>
            </div>

            <Field label="Comment">
              <textarea
                value={form.comment ?? ''}
                onChange={(event) =>
                  handleChange('comment', event.target.value)
                }
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Optional note for this publish action"
              />
            </Field>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => pageBuilderActions.closePublishModal()}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPublishing}
                className="inline-flex items-center rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
              >
                {isPublishing ? 'Publishing…' : 'Publish Version'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
