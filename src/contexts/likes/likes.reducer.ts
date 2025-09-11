'use client';

export type LikeItem = {
  sku: string;
  likedAt?: string | null; // ISO
  isActive?: boolean;
};

export type LikesSummary = {
  totalCount: number;
  updatedAt?: string | null; // ISO
};

type Action =
  | { type: 'HYDRATE_REPLACE'; items: LikeItem[]; summary?: LikesSummary | null }
  | { type: 'HYDRATE_MERGE'; items: LikeItem[]; summary?: LikesSummary | null }
  | { type: 'SET_SUMMARY'; summary: LikesSummary | null }
  | { type: 'LIKE_ADD'; item: LikeItem }
  | { type: 'LIKE_REMOVE'; sku: string }
  | { type: 'LIKE_TOGGLE'; sku: string; liked: boolean; likedAt?: string | null }
  | { type: 'RESET_LIKES' };

export interface State {
  items: LikeItem[];              // flat list
  index: Record<string, number>;  // sku -> index
  isEmpty: boolean;
  summary: LikesSummary | null;
}

export const initialState: State = {
  items: [],
  index: {},
  isEmpty: true,
  summary: { totalCount: 0, updatedAt: null },
};

function rebuildIndex(items: LikeItem[]) {
  const list = Array.isArray(items) ? items : ([] as LikeItem[]);
  const index: Record<string, number> = {};
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (it && typeof it.sku === 'string') index[it.sku] = i;
  }
  return index;
}

function finalize(state: State, items: LikeItem[], summary?: LikesSummary | null): State {
  const list = Array.isArray(items) ? items : ([] as LikeItem[]);
  const idx = rebuildIndex(list);
  const totalCount = list.length;
  return {
    ...state,
    items: list,
    index: idx,
    isEmpty: totalCount === 0,
    summary:
      summary ?? state.summary
        ? { ...(state.summary ?? { totalCount: 0, updatedAt: null }), totalCount }
        : { totalCount, updatedAt: null },
  };
}

export function likesReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE_REPLACE': {
      return finalize(state, action.items, action.summary ?? undefined);
    }
    case 'HYDRATE_MERGE': {
      const map = new Map<string, LikeItem>();
      for (const it of state.items) map.set(it.sku, it);
      for (const it of action.items) map.set(it.sku, { ...(map.get(it.sku) || {}), ...it });
      return finalize(state, Array.from(map.values()), action.summary ?? undefined);
    }
    case 'SET_SUMMARY':
      return { ...state, summary: action.summary };
    case 'LIKE_ADD': {
      if (state.index[action.item.sku] != null) return state;
      const items = [action.item, ...state.items];
      return finalize(state, items);
    }
    case 'LIKE_REMOVE': {
      if (state.index[action.sku] == null) return state;
      const items = state.items.filter((x) => x.sku !== action.sku);
      return finalize(state, items);
    }
    case 'LIKE_TOGGLE': {
      const i = state.index[action.sku];
      if (action.liked) {
        // ensure present
        if (i != null) {
          const next = [...state.items];
          next[i] = { ...next[i], isActive: true, likedAt: action.likedAt ?? next[i].likedAt ?? null };
          return finalize(state, next);
        }
        return finalize(state, [{ sku: action.sku, isActive: true, likedAt: action.likedAt ?? null }, ...state.items]);
      }
      // unlike: remove if present
      if (i != null) {
        const next = state.items.filter((x) => x.sku !== action.sku);
        return finalize(state, next);
      }
      return state;
    }
    case 'RESET_LIKES':
      return initialState;
    default:
      return state;
  }
}
