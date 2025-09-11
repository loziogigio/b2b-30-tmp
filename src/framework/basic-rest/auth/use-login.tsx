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
  const res = await post<any>(API_ENDPOINTS_B2B.LOGIN, body);
  // token may be under message.token
  const token = res?.message?.token || res?.token || '';
  return { raw: res, token };
}
export const useLoginMutation = () => {
  const { authorize, closeModal } = useUI();
  return useMutation({
    mutationFn: (input: LoginInputType) => login(input),
    onSuccess: (data) => {
      if (data?.token) {
        Cookies.set('auth_token', data.token);
      }
      // Map ERP session defaults
      applyLoginToErpStatic(data?.raw, data?.raw?.user_profile_settings?.username || '');
      authorize();
      closeModal();
    },
    onError: (data) => {
      console.log(data, 'login error response');
    },
  });
};
