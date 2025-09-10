// app/[lang]/account/change-password/change-password.client.tsx
'use client';

import * as React from 'react';
import cn from 'classnames';
import { useChangePasswordMutation } from '@framework/acccount/change-password';
import { useTranslation } from 'src/app/i18n/client';

export default function ChangePasswordClient({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { mutateAsync, isPending } = useChangePasswordMutation();

  const [username, setUsername] = React.useState('');
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [showOld, setShowOld] = React.useState(false);

  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const canSubmit = username.trim() && oldPassword && newPassword && newPassword.length >= 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!canSubmit) {
      setError(t('text-fill-required-fields') ?? 'Please fill all required fields.');
      return;
    }
    try {
      const res = await mutateAsync({
        username: username.trim(),
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(res.message || (t('text-password-changed') ?? 'Password changed successfully.'));
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || (t('text-change-password-failed') ?? 'Change password failed.'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={onSubmit} className="rounded-md border border-gray-200 bg-white p-5 sm:p-6">
        <h1 className="mb-4 text-lg font-semibold text-gray-900">
          {t('CHANGE_PASSWORD') ?? 'Change Password'}
        </h1>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Username */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-700">{t('Email') ?? 'Email'} *</label>
          <input
            type="email"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={(t('Email') ?? 'Email') + ' *'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        {/* Old */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-700">{t('Old Password') ?? 'Old Password'} *</label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder={(t('Old Password') ?? 'Old Password') + ' *'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowOld((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showOld ? (t('HIDE') ?? 'Hide') : (t('SHOW') ?? 'Show')}
            </button>
          </div>
        </div>

        {/* New */}
        <div>
          <label className="mb-1 block text-sm text-gray-700">{t('New Password') ?? 'New Password'} *</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={(t('New Password') ?? 'New Password') + ' *'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showNew ? (t('HIDE') ?? 'Hide') : (t('SHOW') ?? 'Show')}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{t('text-password-hint') ?? 'Use at least 8 characters.'}</p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className={cn(
            'mt-5 inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white',
            (!canSubmit || isPending) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isPending ? (t('text-saving') ?? 'Saving…') : (t('CHANGE_PASSWORD') ?? 'Change Password')}
        </button>
      </form>
    </div>
  );
}
