'use client';

import * as React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import { useUI } from '@contexts/ui.context';
import {
  toggleReminder as apiToggleReminder,
  getBulkReminderStatus as apiGetBulkReminderStatus,
  getUserReminders as apiGetUserReminders,
  clearAllUserReminders as apiClearAllUserReminders,
} from '@framework/reminders';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
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

const FALLBACK_REMINDERS_ENDPOINTS = {
  ROOT: '/api/reminders',
  TOGGLE: '/api/reminders/toggle',
  STATUS: (userId: string, sku: string) =>
    `/api/reminders/status/${userId}/${sku}`,
  BULK_STATUS: '/api/reminders/status/bulk',
  USER: (userId: string) => `/api/reminders/user/${userId}`,
  USER_SUMMARY: (userId: string) => `/api/reminders/user/${userId}/summary`,
  CLEAR_ALL: (userId: string) => `/api/reminders/user/${userId}/all`,
};

const EP =
  (API_ENDPOINTS_B2B?.REMINDERS as any) ?? FALLBACK_REMINDERS_ENDPOINTS;

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
  React.useEffect(() => {
    // Only fetch when user is logged in
    if (!isAuthorized) {
      console.log('[RemindersContext] Not authorized, skipping server refresh');
      return;
    }
    if (didRefreshFromServer.current) {
      console.log('[RemindersContext] Already refreshed from server, skipping');
      return;
    }
    console.log('[RemindersContext] Authorized, refreshing from server...');
    didRefreshFromServer.current = true;
    // fetch within backend limit (<= 100)
    loadUserReminders(1, 100, 'replace').catch((err) => {
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
        const response = await apiGetBulkReminderStatus(skus);
        const statuses = Array.isArray(response)
          ? response
          : Array.isArray((response as any)?.reminder_statuses)
            ? (response as any).reminder_statuses
            : [];

        if (!statuses.length) {
          return {};
        }

        const map: Record<string, boolean> = {};
        const nextItemsMap = new Map<string, ReminderItem>();

        for (const existing of state.items) {
          if (existing?.sku) {
            nextItemsMap.set(existing.sku, existing);
          }
        }

        let didMutate = false;

        for (const status of statuses) {
          const sku = status?.sku;
          if (!sku) continue;

          const active = !!status.has_active_reminder;
          map[sku] = active;

          if (active) {
            const current = nextItemsMap.get(sku);
            const updated: ReminderItem = {
              sku,
              isActive: true,
              createdAt:
                status.reminder_created_at ?? current?.createdAt ?? null,
              expiresAt: current?.expiresAt ?? null,
            };
            nextItemsMap.set(sku, updated);
            if (!current || !current.isActive) {
              didMutate = true;
            }
          } else if (nextItemsMap.has(sku)) {
            nextItemsMap.delete(sku);
            didMutate = true;
          }
        }

        if (didMutate) {
          dispatch({
            type: 'HYDRATE_REPLACE',
            items: Array.from(nextItemsMap.values()),
            summary: state.summary ?? null,
          });
        }

        return map;
      } catch {
        return {};
      }
    },
    [isAuthorized, state.items, state.summary],
  );

  const toggle = React.useCallback(
    async (sku: string) => {
      const result = await apiToggleReminder(sku);
      const active = result.has_active_reminder;
      const now = new Date().toISOString();
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
