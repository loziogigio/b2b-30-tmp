// src/contexts/address/address.context.tsx
'use client';

import React from 'react';
import { useLocalStorage } from '@utils/use-local-storage';
import {
  addressInitialState,
  AddressState,
  type AddressB2B,
} from '@framework/acccount/types-b2b-account';
import { addressReducer } from './address.reducer';
import {
  ADDRESS_STATE_COOKIE,
  ADDRESS_STATE_COOKIE_MAX_AGE,
} from '@/lib/page-context';
import { setCookie, deleteCookie } from '@utils/cookies';

// Re-export for backwards compatibility
export { ADDRESS_STATE_COOKIE };

type AddressContextShape = AddressState & {
  setSelectedAddress: (addr: AddressB2B | null) => void;
  resetSelectedAddress: () => void;
};

const AddressContext = React.createContext<AddressContextShape | undefined>(
  undefined,
);
AddressContext.displayName = 'AddressContext';

const LS_KEY = 'b2b-delivery-address';

// Helper to set/delete address state cookie using centralized utility
const setAddressStateCookie = (state: string | null) => {
  if (typeof window === 'undefined') return;
  if (state) {
    setCookie(
      ADDRESS_STATE_COOKIE,
      state,
      ADDRESS_STATE_COOKIE_MAX_AGE / 86400,
    ); // Convert seconds to days
  } else {
    deleteCookie(ADDRESS_STATE_COOKIE);
  }
};

// Send Set-Cookie from the server to guarantee the browser processes the change
const syncAddressCookieWithServer = async (state: string | null) => {
  try {
    await fetch('/api/address-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure Set-Cookie is applied
      body: JSON.stringify({ addressState: state }),
    });
  } catch (error) {
    console.warn(
      '[AddressProvider] Failed to sync address cookie with server',
      error,
    );
  }
};

export function AddressProvider(props: React.PropsWithChildren) {
  const [saved, save] = useLocalStorage(LS_KEY, '');
  const [state, dispatch] = React.useReducer(
    addressReducer,
    addressInitialState,
  );
  const lastAddressStateRef = React.useRef<string | null | undefined>(
    undefined,
  );

  // Hydrate once from localStorage
  const bootstrappedRef = React.useRef(false);
  React.useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    try {
      const parsed = saved ? (JSON.parse(saved) as AddressB2B | null) : null;
      if (parsed) dispatch({ type: 'SET_SELECTED', payload: parsed });
    } catch {
      // Ignore hydration errors - start with empty state
    }
  }, [saved]);

  // persist on change
  React.useEffect(() => {
    try {
      save(JSON.stringify(state.selected));
    } catch {}
  }, [state.selected, save]);

  // Sync address state cookie for server-side home page personalization
  React.useEffect(() => {
    const addressState = state.selected?.address?.state || null;
    if (lastAddressStateRef.current === addressState) return;
    lastAddressStateRef.current = addressState;

    // Set cookie client-side and sync via server API for reliable SSR
    setAddressStateCookie(addressState);
    void syncAddressCookieWithServer(addressState);
  }, [state.selected]);

  const setSelectedAddress = React.useCallback(
    (addr: AddressB2B | null) =>
      dispatch({ type: 'SET_SELECTED', payload: addr }),
    [],
  );
  const resetSelectedAddress = React.useCallback(
    () => dispatch({ type: 'RESET' }),
    [],
  );

  const value = React.useMemo(
    () => ({ ...state, setSelectedAddress, resetSelectedAddress }),
    [state, setSelectedAddress, resetSelectedAddress],
  );

  return <AddressContext.Provider value={value} {...props} />;
}

export const useDeliveryAddress = () => {
  const ctx = React.useContext(AddressContext);
  if (!ctx)
    throw new Error('useDeliveryAddress must be used within AddressProvider');
  return ctx;
};
