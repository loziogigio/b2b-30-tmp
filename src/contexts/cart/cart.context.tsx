'use client';

import React, { useCallback } from 'react';
import { cartReducer, State, initialState } from './cart.reducer';
import { CartSummary, Item, getItem, inStock } from './cart.utils';
import { useLocalStorage } from '@utils/use-local-storage';
import {
  addOrUpdateCartItem,
  deleteCart,
  fetchCartData,
} from '@framework/cart/b2b-cart';
import { AddToCartInput } from '@utils/transform/cart';

// Mapped API getter that returns Item[]

interface CartProviderState extends State {
  addItemToCart: (item: Item, quantity: number) => void;
  removeItemFromCart: (id: Item['id']) => void;
  /**
   * Remove a specific cart line. Accepts either the full `Item` (preferred —
   * carries promo identity so the right line is targeted when LISTINO + PROMO
   * lines coexist) or just the id (legacy — removes the first matching line).
   */
  clearItemFromCart: (idOrItem: Item['id'] | Item) => void;
  getItemFromCart: (id: Item['id']) => any | undefined;
  isInCart: (id: Item['id']) => boolean;
  isInStock: (id: Item['id']) => boolean;
  setItemQuantity: (item: Item, quantity: number) => void;
  resetCart: (idCart?: number | string) => Promise<void>;
  hydrateFromServer: (serverItems: Item[], mode?: 'replace' | 'merge') => void;
  getCart: (mode?: 'replace' | 'merge') => Promise<void>;
  setCartSummary: (meta: CartSummary | null) => void;
}

export const cartContext = React.createContext<CartProviderState | undefined>(
  undefined,
);
cartContext.displayName = 'CartContext';

export const useCart = () => {
  const context = React.useContext(cartContext);
  if (context === undefined) {
    throw new Error(`useCart must be used within a CartProvider`);
  }
  return context;
};

export function CartProvider(props: React.PropsWithChildren<any>) {
  // Keep localStorage for persistence, but DO NOT seed the initial render from it.
  const [savedCart, saveCart] = useLocalStorage(
    'vinc-b2b-cart',
    JSON.stringify(initialState),
  );

  // Hydration-safe: start from a fixed state (matches server HTML).
  const [state, dispatch] = React.useReducer(cartReducer, initialState);

  // After mount, bootstrap from localStorage snapshot (if any).
  const bootstrappedRef = React.useRef(false);
  React.useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    try {
      const snapshot: State | undefined = JSON.parse(savedCart ?? '');
      if (snapshot?.items?.length) {
        dispatch({ type: 'RESET_CART' });
        for (const it of snapshot.items) {
          dispatch({
            type: 'SET_ITEM_QUANTITY',
            item: it as Item,
            quantity: it.quantity ?? 0,
          });
        }
      }
    } catch {
      // ignore malformed LS
    }
  }, [savedCart]);

  // Persist to localStorage on every state change (client-only).
  React.useEffect(() => {
    try {
      saveCart(JSON.stringify(state));
    } catch {
      // ignore quota or SSR
    }
  }, [state, saveCart]);

  // ---- Actions
  const addItemToCart = (item: Item, quantity: number) =>
    dispatch({ type: 'ADD_ITEM_WITH_QUANTITY', item, quantity });

  const removeItemFromCart = (id: Item['id']) =>
    dispatch({ type: 'REMOVE_ITEM_OR_QUANTITY', id, quantity: 1 });

  const setItemQuantity = (item: Item, quantity: number) =>
    dispatch({ type: 'SET_ITEM_QUANTITY', item, quantity });

  // ---- Selectors
  const isInCart = useCallback(
    (id: Item['id']) => !!getItem(state.items, id),
    [state.items],
  );
  const getItemFromCart = useCallback(
    (id: Item['id']) => getItem(state.items, id),
    [state.items],
  );
  const isInStock = useCallback(
    (id: Item['id']) => inStock(state.items, id),
    [state.items],
  );

  // ---- Hydration helper (merge/replace)

  const hydrateFromServer = React.useCallback(
    (serverItems: Item[], mode: 'replace' | 'merge' = 'replace') => {
      if (mode === 'replace') {
        dispatch({ type: 'HYDRATE_REPLACE', items: serverItems });
      } else {
        dispatch({ type: 'HYDRATE_MERGE', items: serverItems });
      }
    },
    [],
  );

  const setCartSummary = React.useCallback((meta: CartSummary | null) => {
    dispatch({ type: 'SET_META', meta });
  }, []);

  const clearItemFromCart = React.useCallback(
    async (idOrItem: Item['id'] | Item) => {
      const isItemObj =
        idOrItem != null &&
        typeof idOrItem === 'object' &&
        'id' in (idOrItem as any);
      const id = isItemObj ? (idOrItem as Item).id : (idOrItem as Item['id']);

      // Resolve the exact line: prefer the caller-supplied item (carries promo
      // identity), otherwise fall back to the first matching id.
      let line: Item | undefined;
      if (isItemObj) {
        const target = idOrItem as Item;
        line = state.items.find(
          (i) =>
            String(i.id) === String(target.id) &&
            String((i as any).promo_code ?? 0) ===
              String((target as any).promo_code ?? 0) &&
            String((i as any).promo_row ?? 0) ===
              String((target as any).promo_row ?? 0),
        );
      }
      if (!line) line = getItem(state.items, id);

      // Optimistic local removal — dispatch SET_ITEM_QUANTITY with 0 + the
      // full line so the reducer's promo-aware matcher only drops THAT row,
      // not every line sharing the id.
      if (line) {
        dispatch({ type: 'SET_ITEM_QUANTITY', item: line, quantity: 0 });
      } else {
        dispatch({ type: 'REMOVE_ITEM', id });
      }

      // Sync to server: send quantity 0 to trigger DELETE for this exact line
      if (line) {
        try {
          const input: AddToCartInput = {
            item_id: id,
            quantity: 0,
            promo_code: (line as any).promo_code ?? 0,
            promo_row: (line as any).promo_row ?? 0,
          };
          await addOrUpdateCartItem(input, state.items, state.meta, line);
          const fresh = await fetchCartData();
          hydrateFromServer(fresh.items, 'replace');
          setCartSummary(fresh.summary);
        } catch (e) {
          console.error('[cart] clearItemFromCart server sync failed:', e);
          const fresh = await fetchCartData();
          hydrateFromServer(fresh.items, 'replace');
          setCartSummary(fresh.summary);
        }
      }
    },
    [state.items, state.meta, hydrateFromServer, setCartSummary],
  );

  // ---- Public API: fetch cart from server and hydrate
  const getCart = React.useCallback(
    async (mode: 'replace' | 'merge' = 'replace') => {
      const { items, summary } = await fetchCartData();
      hydrateFromServer(items, mode);
      setCartSummary(summary);
    },
    [hydrateFromServer, setCartSummary],
  );

  const addToCartServer = React.useCallback(
    async (input: AddToCartInput, sourceItem?: Item) => {
      await addOrUpdateCartItem(input, state.items, state.meta, sourceItem);
      const fresh = await fetchCartData();
      hydrateFromServer(fresh.items, 'replace');
      setCartSummary(fresh.summary);
      return fresh;
    },
    [state.items, state.meta, hydrateFromServer, setCartSummary],
  );

  // ---- NEW: resetCart that calls backend DELETE_CART and re-syncs
  // signature in context type: resetCart: (idCart?: number | string) => Promise<void>

  const resetCart = React.useCallback(
    async (idCart?: number | string) => {
      try {
        if (idCart != null && idCart !== '') {
          await deleteCart(idCart);
        }
      } finally {
        const fresh = await fetchCartData();
        hydrateFromServer(fresh.items, 'replace');
        setCartSummary(fresh.summary);
        dispatch({ type: 'RESET_CART' });
      }
    },
    [hydrateFromServer, setCartSummary],
  );

  const value = React.useMemo(
    () => ({
      ...state,
      addItemToCart,
      removeItemFromCart,
      clearItemFromCart,
      getItemFromCart,
      isInCart,
      isInStock,
      resetCart,
      setItemQuantity,
      hydrateFromServer,
      getCart,
      setCartSummary,
      addToCartServer,
    }),
    [
      getItemFromCart,
      isInCart,
      isInStock,
      state,
      getCart,
      setCartSummary,
      addToCartServer,
      resetCart,
      clearItemFromCart,
    ],
  );

  return <cartContext.Provider value={value} {...props} />;
}
