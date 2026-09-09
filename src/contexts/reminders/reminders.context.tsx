'use client';

import * as React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import { useUI } from '@contexts/ui.context';
import { createStatusBatcher, type StatusBatcher } from '@/lib/status-batcher';
import {
  toggleReminder as apiToggleReminder,
  getBulkReminderStatus as apiGetBulkReminderStatus,
  getUserReminders as apiGetUserReminders,
  clearAllUserReminders as apiClearAllUserReminders,
} from '@framework/reminders';
import {
  remindersReducer,
  initialState,
  State as RemindersState,
  ReminderItem,
  RemindersSummary,
} from './reminders.reducer';

type ToggleResult = {
  sku: string;
  user_id: string;
  action: 'created' | 'cancelled';
  has_active_reminder: boolean;
};

type UserRemindersResponse = {
  reminders: Array<{
    sku: string;
    created_at?: string | null;
    expires_at?: string | null;
    is_active?: boolean;
  }>;
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

type BulkStatusResponse = {
  user_id: string;
  reminder_statuses: Array<{
    sku: string;
    has_active_reminder: boolean;
    reminder_created_at?: string | null;
  }>;
};

type ReminderStatus = { active: boolean; createdAt: string | null };

/** One Suite call for many SKUs; the batcher decides when and how many. */
async function fetchReminderStatuses(
  skus: string[],
): Promise<Record<string, ReminderStatus>> {
  const response = await apiGetBulkReminderStatus(skus);
  const statuses: BulkStatusResponse['reminder_statuses'] = Array.isArray(
    response,
  )
    ? response
    : Array.isArray((response as any)?.reminder_statuses)
      ? (response as any).reminder_statuses
      : [];
  const out: Record<string, ReminderStatus> = {};
  for (const st of statuses) {
    const sku = st?.sku;
    if (!sku) continue;
    out[sku] = {
      active: !!st.has_active_reminder,
      createdAt: st.reminder_created_at ?? null,
    };
  }
  return out;
}

export interface RemindersProviderState extends RemindersState {
  hasReminder: (sku: string) => boolean;
  add: (
    sku: string,
    createdAt?: string | null,
    expiresAt?: string | null,
  ) => Promise<void>;
  remove: (sku: string) => Promise<void>;
  toggle: (sku: string) => Promise<void>;
  hydrateFromServer: (
    items: ReminderItem[],
    summary?: RemindersSummary | null,
    mode?: 'replace' | 'merge',
  ) => void;
  loadUserReminders: (
    page?: number,
    pageSize?: number,
    mode?: 'replace' | 'merge',
  ) => Promise<void>;
  loadBulkStatus: (skus: string[]) => Promise<Record<string, boolean>>;
  clearAll: () => Promise<void>;
  setSummary: (summary: RemindersSummary | null) => void;
}

export const RemindersContext = React.createContext<
  RemindersProviderState | undefined
>(undefined);
RemindersContext.displayName = 'RemindersContext';

export function useReminders() {
  const ctx = React.useContext(RemindersContext);
  if (!ctx)
    throw new Error('useReminders must be used within a RemindersProvider');
  return ctx;
}

export function RemindersProvider(props: React.PropsWithChildren) {
  const { isAuthorized } = useUI();

  // LocalStorage persistence (do not seed SSR)
  const [saved, save] = useLocalStorage(
    'vinc-app-reminders',
    JSON.stringify(initialState),
  );
  const [state, dispatch] = React.useReducer(remindersReducer, initialState);

  // Coalesces the per-row status lookups of a list into one request per
  // render batch (see src/lib/status-batcher.ts). Kept in a ref so the
  // callbacks below stay stable across state updates.
  const statusBatcherRef = React.useRef<StatusBatcher<ReminderStatus> | null>(
    null,
  );
  if (statusBatcherRef.current === null) {
    statusBatcherRef.current = createStatusBatcher(fetchReminderStatuses);
  }
  React.useEffect(() => {
    // A different user (or none) means every cached answer is wrong.
    statusBatcherRef.current?.reset();
  }, [isAuthorized]);

  // Bootstrap after mount
  const bootstrapped = React.useRef(false);
  React.useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    try {
      const snapshot: RemindersState | undefined = JSON.parse(saved ?? '');
      console.log(
        '[RemindersContext] Bootstrap from localStorage:',
        snapshot?.items?.length ?? 0,
        'items',
      );
      if (snapshot?.items?.length) {
        dispatch({
          type: 'HYDRATE_REPLACE',
          items: snapshot.items,
          summary: snapshot.summary ?? null,
        });
      }
    } catch {
      // ignore bad LS
    }
  }, [saved]);

  // Persist on change
  React.useEffect(() => {
    try {
      console.log(
        '[RemindersContext] Saving state to localStorage:',
        state.items.length,
        'items',
      );
      save(JSON.stringify(state));
    } catch {
      // ignore quota
    }
  }, [state, save]);

  // ----- Helpers
  const hasReminder = React.useCallback(
    (sku: string) => state.index[sku] != null,
    [state.index],
  );

  const hydrateFromServer = React.useCallback(
    (
      items: ReminderItem[],
      summary?: RemindersSummary | null,
      mode: 'replace' | 'merge' = 'replace',
    ) => {
      if (mode === 'replace') {
        dispatch({ type: 'HYDRATE_REPLACE', items, summary: summary ?? null });
      } else {
        dispatch({ type: 'HYDRATE_MERGE', items, summary: summary ?? null });
      }
    },
    [],
  );

  const setSummary = React.useCallback((summary: RemindersSummary | null) => {
    dispatch({ type: 'SET_SUMMARY', summary });
  }, []);

  // ----- Server calls (using your httpB2B wrappers)
  const loadUserReminders = React.useCallback(
    async (page = 1, pageSize = 50, mode: 'replace' | 'merge' = 'replace') => {
      console.log(
        '[RemindersContext] loadUserReminders called, fetching from server...',
      );
      const res = await apiGetUserReminders(
        page,
        pageSize,
        undefined,
        'active',
      );
      console.log(
        '[RemindersContext] loadUserReminders response:',
        res?.total_count,
        'reminders',
      );
      const items: ReminderItem[] =
        (res?.reminders ?? []).map((r) => ({
          sku: r.sku,
          createdAt: r.created_at ?? null,
          expiresAt: r.expires_at ?? null,
          isActive: r.is_active,
        })) || [];
      const summary: RemindersSummary = {
        totalCount: res?.total_count ?? items.length,
        activeCount: items.filter((i) => i.isActive).length,
        updatedAt: new Date().toISOString(),
      };
      hydrateFromServer(items, summary, mode);
    },
    [hydrateFromServer],
  );

  // Refresh reminders from server when user is authorized
  const didRefreshFromServer = React.useRef(false);
  const prevIsAuthorized = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    // Reset flag on ANY auth state change (login or logout)
    if (
      prevIsAuthorized.current !== null &&
      prevIsAuthorized.current !== isAuthorized
    ) {
      didRefreshFromServer.current = false;
    }
    prevIsAuthorized.current = isAuthorized;

    if (!isAuthorized || didRefreshFromServer.current) return;

    didRefreshFromServer.current = true;
    loadUserReminders(1, 100, 'replace').catch((err) => {
      // 401 is handled by auth interceptor (clears cookies, dispatches session-expired)
      if (err?.response?.status === 401) return;
      console.error(
        '[RemindersContext] Failed to load reminders from server:',
        err,
      );
    });
  }, [isAuthorized, loadUserReminders]);

  const loadBulkStatus = React.useCallback(
    async (skus: string[]) => {
      // Don't call API if user is not logged in
      if (!isAuthorized) return {};
      if (!skus?.length) return {};

      try {
        // Rows mounting together share one request; repeats are answered
        // from cache. This callback depends on nothing that changes with
        // state, so a response never re-triggers the rows that asked.
        const result = await statusBatcherRef.current!.load(skus);
        const statuses = Object.entries(result).map(([sku, st]) => ({
          sku,
          active: st.active,
          createdAt: st.createdAt,
        }));
        const map: Record<string, boolean> = {};
        for (const st of statuses) map[st.sku] = st.active;
        if (statuses.length) dispatch({ type: 'BULK_STATUS', statuses });
        return map;
      } catch {
        return {};
      }
    },
    [isAuthorized],
  );

  const toggle = React.useCallback(
    async (sku: string) => {
      const result = await apiToggleReminder(sku);
      const active = result.has_active_reminder;
      const now = new Date().toISOString();
      statusBatcherRef.current?.prime({
        [sku]: { active, createdAt: active ? now : null },
      });
      // Expiration = 30 days from now
      const expiresAt = active
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      dispatch({
        type: 'REMINDER_TOGGLE',
        sku,
        active,
        createdAt: active ? now : null,
        expiresAt: expiresAt,
      });

      // Optionally refresh server summary count
      setSummary({
        totalCount: active
          ? (state.summary?.totalCount ?? 0) + 1
          : Math.max(0, (state.summary?.totalCount ?? 1) - 1),
        activeCount: active
          ? (state.summary?.activeCount ?? 0) + 1
          : Math.max(0, (state.summary?.activeCount ?? 1) - 1),
        updatedAt: now,
      });
    },
    [setSummary, state.summary],
  );

  const add = React.useCallback(
    async (
      sku: string,
      createdAt?: string | null,
      expiresAt?: string | null,
    ) => {
      if (hasReminder(sku)) return;
      await apiToggleReminder(sku);
      const now = new Date().toISOString();
      statusBatcherRef.current?.prime({
        [sku]: { active: true, createdAt: now },
      });
      const expires =
        expiresAt ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      dispatch({
        type: 'REMINDER_ADD',
        item: {
          sku,
          createdAt: createdAt ?? now,
          expiresAt: expires,
          isActive: true,
        },
      });
      setSummary({
        totalCount: (state.summary?.totalCount ?? 0) + 1,
        activeCount: (state.summary?.activeCount ?? 0) + 1,
        updatedAt: now,
      });
    },
    [hasReminder, setSummary, state.summary],
  );

  const remove = React.useCallback(
    async (sku: string) => {
      if (!hasReminder(sku)) return;
      await apiToggleReminder(sku);
      statusBatcherRef.current?.prime({
        [sku]: { active: false, createdAt: null },
      });
      dispatch({ type: 'REMINDER_REMOVE', sku });
      setSummary({
        totalCount: Math.max(0, (state.summary?.totalCount ?? 1) - 1),
        activeCount: Math.max(0, (state.summary?.activeCount ?? 1) - 1),
        updatedAt: new Date().toISOString(),
      });
    },
    [hasReminder, setSummary, state.summary],
  );

  const clearAll = React.useCallback(async () => {
    await apiClearAllUserReminders();
    statusBatcherRef.current?.reset();
    dispatch({ type: 'RESET_REMINDERS' });
  }, []);

  const value = React.useMemo<RemindersProviderState>(
    () => ({
      ...state,
      hasReminder,
      add,
      remove,
      toggle,
      hydrateFromServer,
      loadUserReminders,
      loadBulkStatus,
      clearAll,
      setSummary,
    }),
    [
      state,
      hasReminder,
      add,
      remove,
      toggle,
      hydrateFromServer,
      loadUserReminders,
      loadBulkStatus,
      clearAll,
      setSummary,
    ],
  );

  return <RemindersContext.Provider value={value} {...props} />;
}
