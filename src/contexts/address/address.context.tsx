// src/contexts/address/address.context.tsx
'use client';

import React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import { addressInitialState, AddressState, type AddressB2B } from '@framework/acccount/types-b2b-account';
import { addressReducer } from './address.reducer';


type AddressContextShape = AddressState & {
  setSelectedAddress: (addr: AddressB2B | null) => void;
  resetSelectedAddress: () => void;
};

const AddressContext = React.createContext<AddressContextShape | undefined>(undefined);
AddressContext.displayName = 'AddressContext';

const LS_KEY = 'b2b-delivery-address';

export function AddressProvider(props: React.PropsWithChildren) {
  const [saved, save] = useLocalStorage(LS_KEY, '');
  const [state, dispatch] = React.useReducer(addressReducer, addressInitialState);

  // hydrate once from localStorage
  const bootstrappedRef = React.useRef(false);
  React.useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    try {
      const parsed = saved ? (JSON.parse(saved) as AddressB2B | null) : null;
      if (parsed) dispatch({ type: 'SET_SELECTED', payload: parsed });
    } catch {}
  }, [saved]);

  // persist on change
  React.useEffect(() => {
    try {
      save(JSON.stringify(state.selected));
    } catch {}
  }, [state.selected, save]);

  const setSelectedAddress = React.useCallback(
    (addr: AddressB2B | null) => dispatch({ type: 'SET_SELECTED', payload: addr }),
    []
  );
  const resetSelectedAddress = React.useCallback(
    () => dispatch({ type: 'RESET' }),
    []
  );

  const value = React.useMemo(
    () => ({ ...state, setSelectedAddress, resetSelectedAddress }),
    [state, setSelectedAddress, resetSelectedAddress]
  );

  return <AddressContext.Provider value={value} {...props} />;
}

export const useDeliveryAddress = () => {
  const ctx = React.useContext(AddressContext);
  if (!ctx) throw new Error('useDeliveryAddress must be used within AddressProvider');
  return ctx;
};
