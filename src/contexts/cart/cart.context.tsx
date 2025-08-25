'use client';

import React, { useCallback } from 'react';
import { cartReducer, State, initialState } from './cart.reducer';
import { Item, getItem, inStock } from './cart.utils';
import { useLocalStorage } from '@utils/use-local-storage';
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
  const [savedCart, saveCart] = useLocalStorage(
    `borobazar-cart`,
    JSON.stringify(initialState),
  );
  const [state, dispatch] = React.useReducer(
    cartReducer,
    JSON.parse(savedCart!),
  );

  React.useEffect(() => {
    saveCart(JSON.stringify(state));
  }, [state, saveCart]);

  const addItemToCart = (item: Item, quantity: number) =>
    dispatch({ type: 'ADD_ITEM_WITH_QUANTITY', item, quantity });
  const removeItemFromCart = (id: Item['id']) =>
    dispatch({ type: 'REMOVE_ITEM_OR_QUANTITY', id });
  const clearItemFromCart = (id: Item['id']) =>
    dispatch({ type: 'REMOVE_ITEM', id });

  const setItemQuantity = (item: Item, quantity: number) =>
    dispatch({ type: 'SET_ITEM_QUANTITY', item, quantity });
  
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
  const resetCart = () => dispatch({ type: 'RESET_CART' });

  const hydrateFromServer = React.useCallback(
    (serverItems: Item[], mode: 'replace' | 'merge' = 'replace') => {
      if (mode === 'replace') {
        dispatch({ type: 'RESET_CART' });
        for (const it of serverItems) {
          dispatch({ type: 'SET_ITEM_QUANTITY', item: it, quantity: it.quantity ?? 0 });
        }
        return;
      }

      // merge: keep local, override/insert server items
      const merged = new Map<string | number, Item>();
      for (const it of state.items) merged.set(it.id, it);
      for (const it of serverItems) merged.set(it.id, { ...(merged.get(it.id) || {}), ...it });

      dispatch({ type: 'RESET_CART' });
      // If your tsconfig targets ES5, avoid iterating the iterator directly
      for (const it of Array.from(merged.values())) {
        dispatch({ type: 'SET_ITEM_QUANTITY', item: it, quantity: it.quantity ?? 0 });
      }
    },
    [state.items]
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
      hydrateFromServer
    }),
    [getItemFromCart, isInCart, isInStock, state],
  );
  return <cartContext.Provider value={value} {...props} />;
}
