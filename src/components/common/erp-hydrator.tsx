'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { hydrateErpStatic, hasValidErpContext } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import { useAddressQuery } from '@framework/acccount/fetch-account';
import { useDeliveryAddress } from '@contexts/address/address.context';

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
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  // Track previous auth state to detect login/logout transitions
  const prevIsAuthorizedRef = useRef<boolean | null>(null);

  // Fetch addresses when authorized
  const { data: addresses } = useAddressQuery(isAuthorized);
  const { selected, setSelectedAddress, resetSelectedAddress } =
    useDeliveryAddress();

  // Check if we're on the home page (needs reload when address changes)
  const isHomePage =
    pathname === '/it' ||
    pathname === '/it/' ||
    pathname === '/en' ||
    pathname === '/en/';

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
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    }

    setHydrated(true);
  }, [isAuthorized, queryClient]);

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
      // Clear all queries on logout to prevent stale data
      queryClient.clear();
    }

    // Detect login: was not authorized, now authorized
    if (prevIsAuthorizedRef.current === false && isAuthorized) {
      // Invalidate and refetch addresses for the new user
      resetSelectedAddress(); // Clear any stale selected address first
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['b2b-cart'] });
      queryClient.invalidateQueries({ queryKey: ['saved-carts'] });
    }

    prevIsAuthorizedRef.current = isAuthorized;
  }, [isAuthorized, resetSelectedAddress, queryClient]);

  // Auto-select first address when addresses are loaded
  // This runs when: user logs in, addresses are fetched, and we need to select one
  useEffect(() => {
    if (isAuthorized && addresses && addresses.length > 0) {
      // Always select first address if none is selected OR if current selected is not in the list
      const selectedIsValid =
        selected && addresses.some((addr) => addr.id === selected.id);
      if (!selectedIsValid) {
        const newAddress = addresses[0];
        setSelectedAddress(newAddress);

        // Reload page if on home page to show personalized template
        // Wait for cookie to be set by AddressProvider
        if (isHomePage && newAddress?.address?.state) {
          setTimeout(() => {
            window.location.reload();
          }, 200);
        }
      }
    }
  }, [isAuthorized, addresses, selected, setSelectedAddress, isHomePage]);

  // This component doesn't render anything
  return null;
}
