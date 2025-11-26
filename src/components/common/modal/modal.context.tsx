'use client';

import React from 'react';

type MODAL_VIEWS =
  | 'SIGN_UP_VIEW'
  | 'LOGIN_VIEW'
  | 'FORGET_PASSWORD'
  | 'PAYMENT'
  | 'ADDRESS_VIEW_AND_EDIT'
  | 'PHONE_NUMBER'
  | 'DELIVERY_VIEW'
  | 'PRODUCT_VIEW'
  | 'CATEGORY_VIEW'
  | 'B2B_PRODUCT_VARIANTS_QUICK_VIEW'
  | 'RADIO_PLAYER';

// One layer in the modal stack
type StackItem = {
  view?: MODAL_VIEWS;
  data?: any;
  // you could add per-layer props later (e.g., variant)
};

interface State {
  // derived (kept for backward compatibility with existing usage)
  view?: MODAL_VIEWS;
  data?: any;
  isOpen: boolean;

  // the actual stack of layers
  stack: StackItem[];
}

type Action =
  | { type: 'open'; view?: MODAL_VIEWS; payload?: any } // push
  | { type: 'close' }                                   // pop
  | { type: 'clear' };                                  // clear all

const initialState: State = {
  view: undefined,
  isOpen: false,
  data: null,
  stack: [],
};

function withDerived(stack: StackItem[]): State {
  const top = stack[stack.length - 1];
  return {
    stack,
    view: top?.view,
    data: top?.data,
    isOpen: stack.length > 0,
  };
}

function modalReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'open': {
      const next = [...state.stack, { view: action.view, data: action.payload }];
      return withDerived(next);
    }
    case 'close': {
      if (state.stack.length === 0) return state;
      const next = state.stack.slice(0, -1);
      return withDerived(next);
    }
    case 'clear': {
      return withDerived([]);
    }
    default:
      throw new Error('Unknown Modal Action!');
  }
}

const ModalStateContext = React.createContext<State>(initialState);
ModalStateContext.displayName = 'ModalStateContext';

const ModalActionContext = React.createContext<
  | {
      openModal: (view?: MODAL_VIEWS, payload?: unknown) => void;
      closeModal: () => void; // pop top
      goBack: () => void;     // alias to closeModal
      closeAll: () => void;   // clear
    }
  | undefined
>(undefined);
ModalActionContext.displayName = 'ModalActionContext';

export function ModalProvider({ children }: React.PropsWithChildren<{}>) {
  const [state, dispatch] = React.useReducer(modalReducer, initialState);

  const actions = React.useMemo(
    () => ({
      openModal(view?: MODAL_VIEWS, payload?: unknown) {
        dispatch({ type: 'open', view, payload });
      },
      closeModal() {
        dispatch({ type: 'close' });
      },
      goBack() {
        dispatch({ type: 'close' });
      },
      closeAll() {
        dispatch({ type: 'clear' });
      },
    }),
    []
  );

  return (
    <ModalStateContext.Provider value={state}>
      <ModalActionContext.Provider value={actions}>
        {children}
      </ModalActionContext.Provider>
    </ModalStateContext.Provider>
  );
}

export function useModalState() {
  const context = React.useContext(ModalStateContext);
  if (context === undefined) {
    throw new Error(`useModalState must be used within a ModalProvider`);
  }
  return context;
}

export function useModalAction() {
  const ctx = React.useContext(ModalActionContext);
  if (!ctx) {
    throw new Error(`useModalAction must be used within a ModalProvider`);
  }
  return ctx;
}
