// @framework/acccount/change-password.ts
import { useMutation } from '@tanstack/react-query';
import type {
  ChangePasswordPayload,
  ResetPasswordPayload,
  ChangePasswordResult,
} from './types-b2b-account';

// Change password (requires current password + new password)
// Email is extracted from SSO access token on server side
export async function changePassword(
  body: ChangePasswordPayload,
): Promise<ChangePasswordResult> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: body.currentPassword,
      password: body.password,
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || 'Change password failed.');
  }

  return { success: true, message: data.message };
}

// Reset password / forgot password (only username, sends email)
export async function resetPassword(
  body: ResetPasswordPayload,
): Promise<ChangePasswordResult> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: body.username }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || 'Reset password failed.');
  }

  return { success: true, message: data.message };
}

export const useChangePasswordMutation = () =>
  useMutation<ChangePasswordResult, Error, ChangePasswordPayload>({
    mutationFn: changePassword,
  });

export const useResetPasswordMutation = () =>
  useMutation<ChangePasswordResult, Error, ResetPasswordPayload>({
    mutationFn: resetPassword,
  });
