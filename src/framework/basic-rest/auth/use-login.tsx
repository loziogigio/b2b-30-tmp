import { useUI } from '@contexts/ui.context';
import Cookies from 'js-cookie';
import { useMutation } from '@tanstack/react-query';
import { applyVincProfileToErpStatic } from '@framework/utils/static';

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  profile?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    status: string;
    supplier_id?: string;
    supplier_name?: string;
    customers: Array<{
      id: string;
      erp_customer_id: string;
      name?: string;
      business_name?: string;
      addresses: Array<{
        id: string;
        erp_address_id: string;
        label?: string;
        pricelist_code?: string;
      }>;
    }>;
  };
  message?: string;
}

async function login(input: LoginInputType): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  const data: LoginResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Credenziali non valide');
  }

  return data;
}
export const useLoginMutation = (onSuccessCallback?: () => void) => {
  const { authorize } = useUI();
  return useMutation({
    mutationFn: (input: LoginInputType) => login(input),
    onSuccess: (data) => {
      console.log(
        '[useLogin] Login success, profile:',
        JSON.stringify(data?.profile, null, 2),
      );
      if (data?.token) {
        Cookies.set('auth_token', data.token);
      }
      if (data?.refresh_token) {
        Cookies.set('refresh_token', data.refresh_token);
      }
      // Map VINC profile to ERP static state
      applyVincProfileToErpStatic(data?.profile || null);
      console.log('[useLogin] After applyVincProfileToErpStatic');
      authorize();
      // Call optional callback (e.g., to close modal from the component)
      onSuccessCallback?.();
      // Reload page after short delay to ensure address cookie is synced
      // This allows server to render personalized content based on user's address
      setTimeout(() => {
        window.location.reload();
      }, 300);
    },
    onError: () => {
      // Error handling is done in the component via mutation options
    },
  });
};
