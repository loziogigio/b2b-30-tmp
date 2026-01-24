'use client';

import * as React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import { useUI } from '@contexts/ui.context';
import {
  addLike,
  removeLike,
  toggleLike as apiToggleLike,
  getBulkLikeStatus as apiGetBulkLikeStatus,
  getUserLikes as apiGetUserLikes,
  clearAllUserLikes as apiClearAllUserLikes,
  getUserLikesSummary as apiGetUserLikesSummary,
} from '@framework/likes';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import {
  likesReducer,
  initialState,
  State as LikesState,
  LikeItem,
  LikesSummary,
} from './likes.reducer';

type ToggleResult = {
  sku: string;
  user_id: string;
  action: 'liked' | 'unliked';
  is_liked: boolean;
  total_likes: number;
};

type UserLikesResponse = {
  likes: { sku: string; liked_at?: string | null; is_active?: boolean }[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

type BulkStatusResponse = {
  user_id: string;
  like_statuses: { sku: string; is_liked: boolean; total_likes: number }[];
};

const FALLBACK_LIKES_ENDPOINTS = {
  ROOT: '/api/likes',
  TOGGLE: '/api/likes/toggle',
  STATUS: (userId: string, sku: string) => `/api/likes/status/${userId}/${sku}`,
  BULK_STATUS: '/api/likes/status/bulk',
  USER: (userId: string) => `/api/likes/user/${userId}`,
  USER_SUMMARY: (userId: string) => `/api/likes/user/${userId}/summary`,
  CLEAR_ALL: (userId: string) => `/api/likes/user/${userId}/all`,
};

const EP = (API_ENDPOINTS_B2B?.LIKES as any) ?? FALLBACK_LIKES_ENDPOINTS;

export interface LikesProviderState extends LikesState {
  isLiked: (sku: string) => boolean;
  like: (sku: string, likedAt?: string | null) => Promise<void>;
  unlike: (sku: string) => Promise<void>;
  toggle: (sku: string) => Promise<void>;
  hydrateFromServer: (
    items: LikeItem[],
    summary?: LikesSummary | null,
    mode?: 'replace' | 'merge',
  ) => void;
  loadUserLikes: (
    page?: number,
    pageSize?: number,
    mode?: 'replace' | 'merge',
  ) => Promise<void>;
  loadBulkStatus: (skus: string[]) => Promise<Record<string, boolean>>;
  clearAll: () => Promise<void>;
  setSummary: (summary: LikesSummary | null) => void;
}

export const LikesContext = React.createContext<LikesProviderState | undefined>(
  undefined,
);
LikesContext.displayName = 'LikesContext';

export function useLikes() {
  const ctx = React.useContext(LikesContext);
  if (!ctx) throw new Error('useLikes must be used within a LikesProvider');
  return ctx;
}

export function LikesProvider(props: React.PropsWithChildren) {
  const { isAuthorized } = useUI();

  // LocalStorage persistence (do not seed SSR)
  const [saved, save] = useLocalStorage(
    'likes-state',
    JSON.stringify(initialState),
  );
  const [state, dispatch] = React.useReducer(likesReducer, initialState);

  // Bootstrap after mount
  const bootstrapped = React.useRef(false);
  React.useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    try {
      const snapshot: LikesState | undefined = JSON.parse(saved ?? '');
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
      save(JSON.stringify(state));
    } catch {
      // ignore quota
    }
  }, [state, save]);

  // ----- Helpers
  const isLiked = React.useCallback(
    (sku: string) => state.index[sku] != null,
    [state.index],
  );

  const hydrateFromServer = React.useCallback(
    (
      items: LikeItem[],
      summary?: LikesSummary | null,
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

  const setSummary = React.useCallback((summary: LikesSummary | null) => {
    dispatch({ type: 'SET_SUMMARY', summary });
  }, []);

  // ----- Server calls (using your httpB2B wrappers)
  const loadUserLikes = React.useCallback(
    async (page = 1, pageSize = 50, mode: 'replace' | 'merge' = 'replace') => {
      const res = await apiGetUserLikes(page, pageSize);
      const items: LikeItem[] =
        (res?.likes ?? []).map((l) => ({
          sku: l.sku,
          likedAt: l.liked_at ?? null,
          isActive: l.is_active,
        })) || [];
      const summary: LikesSummary = {
        totalCount: res?.total_count ?? items.length,
        updatedAt: new Date().toISOString(),
      };
      hydrateFromServer(items, summary, mode);
    },
    [hydrateFromServer],
  );

  // Refresh likes from server when user is authorized
  const didRefreshFromServer = React.useRef(false);
  React.useEffect(() => {
    // Only fetch when user is logged in
    if (!isAuthorized) return;
    if (didRefreshFromServer.current) return;
    didRefreshFromServer.current = true;
    // fetch within backend limit (<= 100)
    loadUserLikes(1, 100, 'replace').catch(() => {});
  }, [isAuthorized, loadUserLikes]);

  const loadBulkStatus = React.useCallback(
    async (skus: string[]) => {
      if (!skus?.length) return {};
      const res = await apiGetBulkLikeStatus(skus);
      const map: Record<string, boolean> = {};
      const likedItems: LikeItem[] = [];
      for (const st of res.like_statuses ?? []) {
        map[st.sku] = !!st.is_liked;
        if (st.is_liked)
          likedItems.push({ sku: st.sku, likedAt: null, isActive: true });
      }
      if (likedItems.length)
        dispatch({
          type: 'HYDRATE_MERGE',
          items: likedItems,
          summary: state.summary ?? null,
        });
      return map;
    },
    [state.summary],
  );

  const toggle = React.useCallback(
    async (sku: string) => {
      const result = await apiToggleLike(sku);
      const liked = result.is_liked;
      dispatch({
        type: 'LIKE_TOGGLE',
        sku,
        liked,
        likedAt: liked ? new Date().toISOString() : null,
      });

      // Optionally refresh server summary count
      setSummary({
        totalCount: liked
          ? (state.summary?.totalCount ?? 0) + 1
          : Math.max(0, (state.summary?.totalCount ?? 1) - 1),
        updatedAt: new Date().toISOString(),
      });
    },
    [setSummary, state.summary],
  );

  const like = React.useCallback(
    async (sku: string, likedAt?: string | null) => {
      if (isLiked(sku)) return;
      await addLike(sku);
      dispatch({
        type: 'LIKE_ADD',
        item: {
          sku,
          likedAt: likedAt ?? new Date().toISOString(),
          isActive: true,
        },
      });
      setSummary({
        totalCount: (state.summary?.totalCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    },
    [isLiked, setSummary, state.summary],
  );

  const unlike = React.useCallback(
    async (sku: string) => {
      if (!isLiked(sku)) return;
      await removeLike(sku);
      dispatch({ type: 'LIKE_REMOVE', sku });
      setSummary({
        totalCount: Math.max(0, (state.summary?.totalCount ?? 1) - 1),
        updatedAt: new Date().toISOString(),
      });
    },
    [isLiked, setSummary, state.summary],
  );

  const clearAll = React.useCallback(async () => {
    await apiClearAllUserLikes();
    dispatch({ type: 'RESET_LIKES' });
  }, []);

  const value = React.useMemo<LikesProviderState>(
    () => ({
      ...state,
      isLiked,
      like,
      unlike,
      toggle,
      hydrateFromServer,
      loadUserLikes,
      loadBulkStatus,
      clearAll,
      setSummary,
    }),
    [
      state,
      isLiked,
      like,
      unlike,
      toggle,
      hydrateFromServer,
      loadUserLikes,
      loadBulkStatus,
      clearAll,
      setSummary,
    ],
  );

  return <LikesContext.Provider value={value} {...props} />;
}
