'use client';

import React, { useCallback } from 'react';
import { cartReducer, State, initialState } from './cart.reducer';
import { CartSummary, Item, getItem, inStock } from './cart.utils';
import { useLocalStorage } from '@utils/use-local-storage';
import { addOrUpdateCartItem, fetchCartData } from '@framework/cart/b2b-cart';
import { AddToCartInput } from '@utils/transform/cart';

// Mapped API getter that returns Item[]


interface CartProviderState extends State {
  addItemToCart: (item: Item, quantity: number) => void;
  removeItemFromCart: (id: Item['id']) => void;
  clearItemFromCart: (id: Item['id']) => void;
  getItemFromCart: (id: Item['id']) => any | undefined;
  isInCart: (id: Item['id']) => boolean;
  isInStock: (id: Item['id']) => boolean;
  setItemQuantity: (item: Item, quantity: number) => void;
  resetCart: () => void;
  hydrateFromServer: (serverItems: Item[], mode?: 'replace' | 'merge') => void;
  getCart: (mode?: 'replace' | 'merge') => Promise<void>;
  setCartSummary: (meta: CartSummary | null) => void;

}

export const cartContext = React.createContext<CartProviderState | undefined>(undefined);
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
  const [savedCart, saveCart] = useLocalStorage('borobazar-cart', JSON.stringify(initialState));

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

  const clearItemFromCart = (id: Item['id']) =>
    dispatch({ type: 'REMOVE_ITEM', id });

  const setItemQuantity = (item: Item, quantity: number) =>
    dispatch({ type: 'SET_ITEM_QUANTITY', item, quantity });

  const resetCart = () => dispatch({ type: 'RESET_CART' });

  // ---- Selectors
  const isInCart = useCallback((id: Item['id']) => !!getItem(state.items, id), [state.items]);
  const getItemFromCart = useCallback((id: Item['id']) => getItem(state.items, id), [state.items]);
  const isInStock = useCallback((id: Item['id']) => inStock(state.items, id), [state.items]);

  // ---- Hydration helper (merge/replace)



  const hydrateFromServer = React.useCallback(
    (serverItems: Item[], mode: 'replace' | 'merge' = 'replace') => {
      if (mode === 'replace') {
        dispatch({ type: 'HYDRATE_REPLACE', items: serverItems });
      } else {
        dispatch({ type: 'HYDRATE_MERGE', items: serverItems });
      }
    },
    [] 
  );

  const setCartSummary = React.useCallback((meta: CartSummary | null) => {
    dispatch({ type: 'SET_META', meta });
  }, []);



  // ---- Public API: fetch cart from server and hydrate
  const getCart = React.useCallback(async (mode: 'replace' | 'merge' = 'replace') => {
    const { items, summary } = await fetchCartData();
    hydrateFromServer(items, mode);
    setCartSummary(summary);
  }, [hydrateFromServer, setCartSummary]);

  const addToCartServer = React.useCallback(
    async (input: AddToCartInput, sourceItem?: Item) => {
      await addOrUpdateCartItem(input, state.items, state.meta, sourceItem);
      const fresh = await fetchCartData();
      hydrateFromServer(fresh.items, 'replace');
      setCartSummary(fresh.summary);
      return fresh;
    },
    [state.items, state.meta, hydrateFromServer, setCartSummary]
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
      addToCartServer
    }),
    [getItemFromCart, isInCart, isInStock, state, getCart, setCartSummary , addToCartServer]
  );

  return <cartContext.Provider value={value} {...props} />;
}
