'use client';

export type ReminderItem = {
  sku: string;
  createdAt?: string | null; // ISO
  expiresAt?: string | null; // ISO
  isActive?: boolean;
};

export type RemindersSummary = {
  totalCount: number;
  activeCount?: number;
  updatedAt?: string | null; // ISO
};

type Action =
  | {
      type: 'HYDRATE_REPLACE';
      items: ReminderItem[];
      summary?: RemindersSummary | null;
    }
  | {
      type: 'HYDRATE_MERGE';
      items: ReminderItem[];
      summary?: RemindersSummary | null;
    }
  | { type: 'SET_SUMMARY'; summary: RemindersSummary | null }
  | { type: 'REMINDER_ADD'; item: ReminderItem }
  | { type: 'REMINDER_REMOVE'; sku: string }
  | {
      type: 'REMINDER_TOGGLE';
      sku: string;
      active: boolean;
      createdAt?: string | null;
      expiresAt?: string | null;
    }
  | { type: 'RESET_REMINDERS' };

export interface State {
  items: ReminderItem[]; // flat list
  index: Record<string, number>; // sku -> index
  isEmpty: boolean;
  summary: RemindersSummary | null;
}

export const initialState: State = {
  items: [],
  index: {},
  isEmpty: true,
  summary: { totalCount: 0, activeCount: 0, updatedAt: null },
};

function rebuildIndex(items: ReminderItem[]) {
  const list = Array.isArray(items) ? items : ([] as ReminderItem[]);
  const index: Record<string, number> = {};
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it && typeof it.sku === 'string') index[it.sku] = i;
  }
  return index;
}

function finalize(
  state: State,
  items: ReminderItem[],
  summary?: RemindersSummary | null,
): State {
  const list = Array.isArray(items) ? items : ([] as ReminderItem[]);
  const idx = rebuildIndex(list);
  const totalCount = list.length;
  const activeCount = list.filter((it) => it.isActive).length;
  return {
    ...state,
    items: list,
    index: idx,
    isEmpty: totalCount === 0,
    summary:
      (summary ?? state.summary)
        ? {
            ...(state.summary ?? {
              totalCount: 0,
              activeCount: 0,
              updatedAt: null,
            }),
            totalCount,
            activeCount,
          }
        : { totalCount, activeCount, updatedAt: null },
  };
}

export function remindersReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE_REPLACE': {
      return finalize(state, action.items, action.summary ?? undefined);
    }
    case 'HYDRATE_MERGE': {
      const map = new Map<string, ReminderItem>();
      for (const it of state.items) map.set(it.sku, it);
      for (const it of action.items)
        map.set(it.sku, { ...(map.get(it.sku) || {}), ...it });
      return finalize(
        state,
        Array.from(map.values()),
        action.summary ?? undefined,
      );
    }
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary };
    case 'REMINDER_ADD': {
      if (state.index[action.item.sku] != null) return state;
      const items = [action.item, ...state.items];
      return finalize(state, items);
    }
    case 'REMINDER_REMOVE': {
      if (state.index[action.sku] == null) return state;
      const items = state.items.filter((x) => x.sku !== action.sku);
      return finalize(state, items);
    }
    case 'REMINDER_TOGGLE': {
      const i = state.index[action.sku];
      if (action.active) {
        // ensure present
        if (i != null) {
          const next = [...state.items];
          next[i] = {
            ...next[i],
            isActive: true,
            createdAt: action.createdAt ?? next[i].createdAt ?? null,
            expiresAt: action.expiresAt ?? next[i].expiresAt ?? null,
          };
          return finalize(state, next);
        }
        return finalize(state, [
          {
            sku: action.sku,
            isActive: true,
            createdAt: action.createdAt ?? null,
            expiresAt: action.expiresAt ?? null,
          },
          ...state.items,
        ]);
      }
      // remove: cancel reminder
      if (i != null) {
        const next = state.items.filter((x) => x.sku !== action.sku);
        return finalize(state, next);
      }
      return state;
    }
    case 'RESET_REMINDERS':
      return initialState;
    default:
      return state;
  }
}
