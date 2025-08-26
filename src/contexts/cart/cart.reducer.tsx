import {
  Item,
  CartSummary,
  UpdateItemInput,
  addItemWithQuantity,
  removeItemOrQuantity,
  addItem,
  updateItem,
  removeItem,
  calculateUniqueItems,
  calculateItemTotals,
  calculateTotalItems,
  calculateTotal
} from './cart.utils';

interface Metadata {
  [key: string]: any;
}

type Action =
  | { type: 'ADD_ITEM_WITH_QUANTITY'; item: Item; quantity: number }
  | { type: 'REMOVE_ITEM_OR_QUANTITY'; id: Item['id']; quantity?: number }
  | { type: 'ADD_ITEM'; id: Item['id']; item: Item }
  | { type: 'UPDATE_ITEM'; id: Item['id']; item: UpdateItemInput }
  | { type: 'REMOVE_ITEM'; id: Item['id'] }
  | { type: 'RESET_CART' }
  | { type: 'SET_ITEM_QUANTITY'; item: Item; quantity: number }
  | { type: 'SET_META'; meta: CartSummary | null }
  | { type: 'HYDRATE_REPLACE'; items: Item[] }
  | { type: 'HYDRATE_MERGE'; items: Item[] };


export interface State {
  items: Item[];
  isEmpty: boolean;
  totalItems: number;
  totalUniqueItems: number;
  total: number;
  meta?: CartSummary | null;
}
export const initialState: State = {
  items: [],
  isEmpty: true,
  totalItems: 0,
  totalUniqueItems: 0,
  total: 0,
  meta: null,
};
export function cartReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE_REPLACE': {
      return generateFinalState(state, action.items);
    }
    case 'HYDRATE_MERGE': {
      const merged = new Map<string | number, Item>();
      for (const it of state.items) merged.set(it.id, it);
      for (const it of action.items) merged.set(it.id, { ...(merged.get(it.id) || {}), ...it });
      return generateFinalState(state, Array.from(merged.values()));
    }
    case 'SET_META':
      return { ...state, meta: action.meta };
    case 'SET_ITEM_QUANTITY': {
      const { item, quantity } = action;
      let items: Item[];
      if (!Number.isFinite(quantity) || quantity <= 0) {
        items = state.items.filter((i) => i.id !== item.id);
      } else {
        const idx = state.items.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
          const next = [...state.items];
          next[idx] = { ...next[idx], quantity };
          items = next;
        } else {
          items = [...state.items, { ...item, quantity }];
        }
      }
      return generateFinalState(state, items);
    }
    case 'ADD_ITEM_WITH_QUANTITY': {
      const items = addItemWithQuantity(
        state.items,
        action.item,
        action.quantity,
      );
      return generateFinalState(state, items);
    }
    case 'REMOVE_ITEM_OR_QUANTITY': {
      const items = removeItemOrQuantity(
        state.items,
        action.id,
        (action.quantity = 1),
      );
      return generateFinalState(state, items);
    }
    case 'ADD_ITEM': {
      const items = addItem(state.items, action.item);
      return generateFinalState(state, items);
    }
    case 'REMOVE_ITEM': {
      const items = removeItem(state.items, action.id);
      return generateFinalState(state, items);
    }
    case 'UPDATE_ITEM': {
      const items = updateItem(state.items, action.id, action.item);
      return generateFinalState(state, items);
    }
    case 'RESET_CART':
      return initialState;
    default:
      return state;
  }
}

const generateFinalState = (state: State, items: Item[]) => {
  const totalUniqueItems = calculateUniqueItems(items);
  return {
    ...state,
    items: calculateItemTotals(items),
    totalItems: calculateTotalItems(items),
    totalUniqueItems,
    total: calculateTotal(items),
    isEmpty: totalUniqueItems === 0,
  };
};
