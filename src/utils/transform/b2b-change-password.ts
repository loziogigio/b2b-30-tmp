// @utils/transform/b2b-change-password.ts
import type {
  RawChangePasswordResponse,
  ChangePasswordResult,
} from '@framework/acccount/types-b2b-account';

export function transformChangePassword(
  res: RawChangePasswordResponse,
): ChangePasswordResult {
  const ok = typeof res?.ReturnCode === 'number' ? res.ReturnCode === 0 : false;
  return {
    success: ok,
    message:
      res?.Message?.trim() ||
      (ok ? 'Password changed successfully.' : 'Unable to change password.'),
  };
}
