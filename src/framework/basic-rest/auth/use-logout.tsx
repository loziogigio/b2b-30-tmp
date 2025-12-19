import { useUI } from '@contexts/ui.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { clearAllCookies } from '@utils/cookies';
import { clearAllB2BSessionData } from '@framework/utils/static';

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}

export const useLogoutMutation = (lang: string) => {
  const { unauthorize } = useUI();
  const queryClient = useQueryClient();
  const { resetSelectedAddress } = useDeliveryAddress();

  return useMutation({
    mutationFn: async () => {
      // Call server API - the response includes Set-Cookie headers that delete cookies
      // This is more reliable than client-side deletion
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
        credentials: 'include', // CRITICAL: include cookies in request AND process Set-Cookie in response
      });
      return res.json();
    },
    onSuccess: async () => {
      // 1. Reset React state
      resetSelectedAddress();
      unauthorize();

      // 2. Clear React Query cache
      queryClient.clear();

      // 3. Clear B2B session data from localStorage (address, cart, ERP static)
      clearAllB2BSessionData();

      // 4. Clear cookies client-side
      clearAllCookies();

      // 5. Navigate via server redirect endpoint
      // This ensures cookies are deleted as part of the HTTP 302 redirect response,
      // which is more reliable than client-side deletion + navigation
      window.location.href = `/api/auth/logout?lang=${lang}`;
    },
    onError: (error) => {
      console.log(error, 'logout error response');
    },
  });
};
