import { useUI } from '@contexts/ui.context';
import Cookies from 'js-cookie';
import { useMutation } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { applyLoginToErpStatic } from '@framework/utils/static';

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}

async function login(input: LoginInputType) {
  // API expects { username, password }
  const body = { username: input.email, password: input.password } as any;
  try {
    const res = await post<any>(API_ENDPOINTS_B2B.LOGIN, body);
    // Check if login was successful
    if (
      res?.success === false ||
      (res?.ReturnCode !== undefined && res?.ReturnCode !== 0)
    ) {
      throw new Error(res?.message || res?.Message || 'Credenziali non valide');
    }
    // token may be under message.token
    const token = res?.message?.token || res?.token || '';
    return { raw: res, token };
  } catch (error: any) {
    // Handle axios error response
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.Message ||
      error?.message ||
      'Credenziali non valide';
    throw new Error(errorMessage);
  }
}
export const useLoginMutation = (onSuccessCallback?: () => void) => {
  const { authorize } = useUI();
  return useMutation({
    mutationFn: (input: LoginInputType) => login(input),
    onSuccess: (data) => {
      if (data?.token) {
        Cookies.set('auth_token', data.token);
      }
      // Map ERP session defaults
      applyLoginToErpStatic(
        data?.raw,
        data?.raw?.user_profile_settings?.username || '',
      );
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
