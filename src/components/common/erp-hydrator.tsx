'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ERP_STATIC,
  hydrateErpStatic,
  hasValidErpContext,
  applyVincProfileToErpStatic,
  setErpStatic,
} from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import { useAddressQuery } from '@framework/acccount/fetch-account';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { useTenantOptional } from '@contexts/tenant.context';
import Cookies from 'js-cookie';

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
  const { isAuthorized, authorize } = useUI();
  const queryClient = useQueryClient();
  const tenantContext = useTenantOptional();
  const [hydrated, setHydrated] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);

  // Track previous auth state to detect login/logout transitions
  const prevIsAuthorizedRef = useRef<boolean | null>(null);

  // Set project_code from tenant context (multi-tenant mode)
  useEffect(() => {
    const projectCode = tenantContext?.tenant?.projectCode;
    if (projectCode) {
      console.log(
        '[ErpHydrator] Setting project_code from TenantContext:',
        projectCode,
      );
      setErpStatic({ project_code: projectCode });
    }
  }, [tenantContext?.tenant?.projectCode]);

  // Fetch addresses only when authorized AND after ERP_STATIC is hydrated
  // This prevents fetching with stale/invalid customer_id from SSR
  const { data: addresses } = useAddressQuery(isAuthorized && hydrated);
  const { selected, setSelectedAddress, resetSelectedAddress } =
    useDeliveryAddress();

  // Handle SSO callback - fetch user profile if coming from SSO login
  const fetchSSOProfile = useCallback(async () => {
    const pendingFlag = Cookies.get('sso_profile_pending');
    if (!pendingFlag) return;

    // Clear the flag immediately
    Cookies.remove('sso_profile_pending', { path: '/' });

    try {
      // First, try to read profile from cookie (set by callback route)
      const profileCookie = Cookies.get('sso_user_profile');
      if (profileCookie) {
        Cookies.remove('sso_user_profile', { path: '/' });
        try {
          const user = JSON.parse(profileCookie);
          console.log('[ErpHydrator] Got user profile from cookie:', user);
          console.log('[ErpHydrator] user.customers:', user.customers);

          const profile = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: 'active',
            supplier_id: user.supplier_id,
            supplier_name: user.supplier_name,
            customers: user.customers || [],
          };

          // Store profile in localStorage
          applyVincProfileToErpStatic(profile);

          // Trigger UI authorization
          authorize();

          // Mark profile as fetched to trigger hydration
          setProfileFetched(true);
          return;
        } catch (parseError) {
          console.error(
            '[ErpHydrator] Failed to parse profile cookie:',
            parseError,
          );
        }
      }

      // Fallback: Fetch user profile from validate endpoint, with one refresh retry
      // if the access token is expired (common when the SSO callback redirect
      // takes longer than the token's short-lived window).
      const tryApplyFromValidate = async (): Promise<boolean> => {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) return false;

        const data = await response.json();
        console.log('[ErpHydrator] Validate response:', data);
        console.log('[ErpHydrator] data.user.customers:', data.user?.customers);

        if (!data.authenticated || !data.user) return false;

        applyVincProfileToErpStatic({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          status: 'active',
          supplier_id: data.user.supplier_id,
          supplier_name: data.user.supplier_name,
          customers: data.user.customers || [],
        });
        authorize();
        setProfileFetched(true);
        return true;
      };

      console.log('[ErpHydrator] Fetching profile from validate endpoint');
      const ok = await tryApplyFromValidate();

      if (!ok) {
        // Token may be expired — try to refresh it, then re-validate once.
        console.log('[ErpHydrator] Validate failed, attempting token refresh');
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          await tryApplyFromValidate();
        }
      }
    } catch (error) {
      console.error('[ErpHydrator] Failed to fetch SSO profile:', error);
    }
  }, [authorize]);

  // Check for SSO profile pending on mount
  useEffect(() => {
    fetchSSOProfile();
  }, [fetchSSOProfile]);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Try to hydrate from localStorage
    const didHydrate = hydrateErpStatic();

    // Fallback: if user is authorized but localStorage has no valid ERP context
    // (e.g. fresh session after token refresh, cleared storage, or first load
    // after login without going through the SSO callback path), call validate
    // to re-populate ERP_STATIC from the server-side session.
    if (isAuthorized && !hasValidErpContext()) {
      (async () => {
        try {
          const res = await fetch('/api/auth/validate', { credentials: 'include' });
          if (!res.ok) {
            // Token may be expired — refresh once then retry
            const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
            if (!refreshRes.ok) return;
            const res2 = await fetch('/api/auth/validate', { credentials: 'include' });
            if (!res2.ok) return;
            const data2 = await res2.json();
            if (data2.authenticated && data2.user) {
              applyVincProfileToErpStatic({ ...data2.user, status: 'active', customers: data2.user.customers || [] });
              setProfileFetched((v) => !v);
            }
            return;
          }
          const data = await res.json();
          if (data.authenticated && data.user) {
            applyVincProfileToErpStatic({ ...data.user, status: 'active', customers: data.user.customers || [] });
            setProfileFetched((v) => !v);
          }
        } catch {
          // silent — not being logged in is a valid state
        }
      })();
    }

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
  }, [isAuthorized, queryClient, profileFetched]);

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

  // Keep ERP_STATIC.address_code in sync with the selected delivery address.
  //
  // The backend keys the active cart on (customer_code + shipping_address_code)
  // — both ERP external codes. AddressB2B.id already IS the address external
  // code (CS maps `id: external_code || address_id`), but address selection only
  // updates AddressContext; ERP_STATIC.address_code stays at its login-time value.
  // Without this sync, cart/active always sends the original address code and
  // returns the same cart no matter which address the user picks.
  const prevAddressCodeRef = useRef<string | null>(null);
  useEffect(() => {
    const nextCode = selected?.id ? String(selected.id) : null;
    if (!nextCode) return;
    if (prevAddressCodeRef.current === nextCode) return;
    prevAddressCodeRef.current = nextCode;

    // Only act when the address actually differs from the persisted ERP context.
    // The steady state (selection already matches ERP_STATIC) is a no-op so the
    // initial load doesn't trigger a spurious cart refetch.
    if (nextCode === ERP_STATIC.address_code) return;

    // New (customer + address) cart key. Clear the cached active-cart id so the
    // next getOrderId()/ensureActiveCart() resolves the correct cart for this
    // address, then refetch cart + saved-carts.
    setErpStatic({ address_code: nextCode, vinc_order_id: undefined });
    queryClient.invalidateQueries({ queryKey: ['b2b-cart'] });
    queryClient.invalidateQueries({ queryKey: ['saved-carts'] });
  }, [selected?.id, queryClient]);

  // This component doesn't render anything
  return null;
}
