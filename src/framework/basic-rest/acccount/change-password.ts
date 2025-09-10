// @framework/acccount/change-password.ts
import { useMutation } from '@tanstack/react-query';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { ERP_STATIC } from '@framework/utils/static';
import { transformChangePassword } from '@utils/transform/b2b-change-password';
import type {
  RawChangePasswordResponse,
  ChangePasswordPayload,
  ChangePasswordResult,
} from './types-b2b-account';

// merge static ERP props + body
const buildPayload = (body: ChangePasswordPayload) => ({ ...ERP_STATIC, ...body });

export async function changePassword(body: ChangePasswordPayload): Promise<ChangePasswordResult> {
  const res = await post<RawChangePasswordResponse>(API_ENDPOINTS_B2B.CHANGE_PASSWORD, buildPayload(body));
  if (!res || typeof res !== 'object') {
    throw new Error('Unexpected ERP response for change password.');
  }
  const out = transformChangePassword(res);
  if (!out.success) {
    throw new Error(out.message || 'Change password failed.');
  }
  return out;
}

export const useChangePasswordMutation = () =>
  useMutation<ChangePasswordResult, Error, ChangePasswordPayload>({
    mutationFn: changePassword,
  });
