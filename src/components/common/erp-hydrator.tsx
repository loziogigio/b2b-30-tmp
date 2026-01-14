'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hydrateErpStatic, hasValidErpContext } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import { useAddressQuery } from '@framework/acccount/fetch-account';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';

/**
 * ErpHydrator - Ensures ERP_STATIC is properly loaded from localStorage on client-side.
 *
 * Problem: ERP_STATIC is loaded when the module initializes. On SSR, localStorage
 * doesn't exist, so it defaults to customer_code: '0'. When the client hydrates,
 * the module isn't re-initialized, so ERP_STATIC keeps the SSR default values.
 *
 * Solution: This component calls hydrateErpStatic() on mount to reload the data
 * from localStorage and invalidates relevant queries to trigger re-fetches.
 */
export default function ErpHydrator() {
  const { isAuthorized } = useUI();
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);

  // Track previous auth state to detect login/logout transitions
  const prevIsAuthorizedRef = useRef<boolean | null>(null);

  // Fetch addresses only when authorized AND after ERP_STATIC is hydrated
  // This prevents fetching with stale/invalid customer_id from SSR
  const { data: addresses } = useAddressQuery(isAuthorized && hydrated);
  const { selected, setSelectedAddress, resetSelectedAddress } =
    useDeliveryAddress();

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Try to hydrate from localStorage
    const didHydrate = hydrateErpStatic();

    // If user is authorized and we successfully hydrated ERP data,
    // invalidate queries so they re-fetch with correct customer context
    if (isAuthorized && didHydrate && hasValidErpContext()) {
      // Invalidate cart and address queries to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['b2b-cart'] });
      queryClient.invalidateQueries({ queryKey: ['saved-carts'] });
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS_B2B.GET_ADDRESSES],
      });
    }

    setHydrated(true);
  }, [isAuthorized, queryClient]);

  // Track if we just logged in to force address selection from API
  const justLoggedInRef = useRef(false);

  // Handle auth state transitions (login/logout)
  useEffect(() => {
    // Skip on initial mount (when prevIsAuthorizedRef.current is null)
    if (prevIsAuthorizedRef.current === null) {
      prevIsAuthorizedRef.current = isAuthorized;
      return;
    }

    // Detect logout: was authorized, now not authorized
    if (prevIsAuthorizedRef.current === true && !isAuthorized) {
      resetSelectedAddress();
      justLoggedInRef.current = false;
      // Clear all queries on logout to prevent stale data
      queryClient.clear();
    }

    // Detect login: was not authorized, now authorized
    if (prevIsAuthorizedRef.current === false && isAuthorized) {
      // Invalidate and refetch addresses for the new user
      resetSelectedAddress(); // Clear any stale selected address first
      justLoggedInRef.current = true; // Mark that we just logged in
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS_B2B.GET_ADDRESSES],
      });
      queryClient.invalidateQueries({ queryKey: ['b2b-cart'] });
      queryClient.invalidateQueries({ queryKey: ['saved-carts'] });
    }

    prevIsAuthorizedRef.current = isAuthorized;
  }, [isAuthorized, resetSelectedAddress, queryClient]);

  // Auto-select first address when addresses are loaded
  // This runs when: user logs in, addresses are fetched, and we need to select one
  useEffect(() => {
    if (isAuthorized && addresses && addresses.length > 0) {
      // Check if current selected is valid (exists in the fetched addresses list)
      // Use String() conversion to handle different ID types (string/number)
      const selectedIsValid =
        selected &&
        addresses.some((addr) => String(addr.id) === String(selected.id));

      // Force select first address if:
      // 1. No selection or invalid selection
      // 2. Just logged in (to ensure fresh selection from API, not stale localStorage)
      const shouldSelect = !selectedIsValid || justLoggedInRef.current;

      if (shouldSelect) {
        // Find the default address from API (if marked) or use first one
        const defaultAddress =
          addresses.find((addr) => addr.isDefault) || addresses[0];
        setSelectedAddress(defaultAddress);
        justLoggedInRef.current = false; // Reset the flag after selecting
      }
    }
  }, [isAuthorized, addresses, selected, setSelectedAddress]);

  // This component doesn't render anything
  return null;
}
