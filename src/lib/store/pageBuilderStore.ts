'use client';

import { useSyncExternalStore } from 'react';
import type { PageVersionTags } from '@/lib/types/blocks';

export interface BuilderVersionSummary {
  version: number;
  status: 'draft' | 'published';
  priority?: number;
  isDefault?: boolean;
  tags?: PageVersionTags;
  activeFrom?: string | Date | null;
  activeTo?: string | Date | null;
  comment?: string | null;
  createdAt?: string;
  lastSavedAt?: string;
  publishedAt?: string;
  blocksCount?: number;
}

interface BuilderFormState {
  campaign?: string;
  segment?: string;
  region?: string;
  language?: string;
  device?: string;
  priority: number;
  isDefault: boolean;
  activeFrom?: string;
  activeTo?: string;
  comment?: string;
  status?: 'draft' | 'published';
}

interface PageBuilderState {
  slug: string;
  versions: BuilderVersionSummary[];
  loading: boolean;
  isPublishing: boolean;
  error?: string | null;
  isPublishModalOpen: boolean;
  selectedVersion?: BuilderVersionSummary | null;
  form: BuilderFormState;
}

const initialFormState: BuilderFormState = {
  priority: 0,
  isDefault: false,
  status: 'published'
};

const initialState: PageBuilderState = {
  slug: 'home',
  versions: [],
  loading: false,
  isPublishing: false,
  error: null,
  isPublishModalOpen: false,
  selectedVersion: null,
  form: initialFormState
};

type Listener = () => void;

class PageBuilderStore {
  private state: PageBuilderState = initialState;
  private listeners = new Set<Listener>();

  getState() {
    return this.state;
  }

  setState(partial: Partial<PageBuilderState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const store = new PageBuilderStore();

export const usePageBuilderStore = <T,>(selector: (state: PageBuilderState) => T): T =>
  useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store.getState()),
    () => selector(store.getState())
  );

const mapVersionToForm = (version?: BuilderVersionSummary | null): BuilderFormState => ({
  campaign: version?.tags?.campaign,
  segment: version?.tags?.segment,
  region: version?.tags?.attributes?.region,
  language: version?.tags?.attributes?.language,
  device: version?.tags?.attributes?.device,
  priority: version?.priority ?? 0,
  isDefault: Boolean(version?.isDefault),
  activeFrom: version?.activeFrom ? new Date(version.activeFrom).toISOString().slice(0, 16) : undefined,
  activeTo: version?.activeTo ? new Date(version.activeTo).toISOString().slice(0, 16) : undefined,
  comment: version?.comment ?? undefined,
  status: version?.status ?? 'published'
});

const fetchJSON = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init);
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) errorMessage = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMessage || 'Request failed');
  }
  return res.json() as Promise<T>;
};

export const pageBuilderActions = {
  initialize(slug: string) {
    store.setState({ slug, error: null });
  },

  setSlug(slug: string) {
    store.setState({ slug });
  },

  async fetchVersions(slug?: string) {
    const currentSlug = slug ?? store.getState().slug;
    if (!currentSlug) return;

    store.setState({ loading: true, error: null, slug: currentSlug });
    try {
      const data = await fetchJSON<{ versions: BuilderVersionSummary[] }>(`/api/pages/${currentSlug}/publish`);
      store.setState({ versions: data.versions ?? [], loading: false, error: null });
    } catch (error) {
      store.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load versions'
      });
    }
  },

  openPublishModal(version: BuilderVersionSummary) {
    store.setState({
      isPublishModalOpen: true,
      selectedVersion: version,
      form: mapVersionToForm(version)
    });
  },

  closePublishModal() {
    store.setState({
      isPublishModalOpen: false,
      selectedVersion: null,
      form: initialFormState
    });
  },

  updateForm(field: keyof BuilderFormState, value: string | number | boolean | undefined) {
    const current = store.getState().form;
    store.setState({
      form: {
        ...current,
        [field]: value
      }
    });
  },

  async submitPublish() {
    const state = store.getState();
    if (!state.slug || !state.selectedVersion) {
      return;
    }

    store.setState({ isPublishing: true, error: null });

    try {
      await fetchJSON(`/api/pages/${state.slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionNumber: state.selectedVersion.version,
          priority: state.form.priority,
          isDefault: state.form.isDefault,
          activeFrom: state.form.activeFrom ? new Date(state.form.activeFrom).toISOString() : null,
          activeTo: state.form.activeTo ? new Date(state.form.activeTo).toISOString() : null,
          comment: state.form.comment ?? null,
          status: state.form.status,
          campaign: state.form.campaign,
          segment: state.form.segment,
          region: state.form.region,
          language: state.form.language,
          device: state.form.device
        })
      });
      store.setState({ isPublishing: false });
      await pageBuilderActions.fetchVersions();
      pageBuilderActions.closePublishModal();
    } catch (error) {
      store.setState({
        isPublishing: false,
        error: error instanceof Error ? error.message : 'Failed to publish version'
      });
    }
  }
};
