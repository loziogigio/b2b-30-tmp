// app/[lang]/account/change-password/change-password.client.tsx
'use client';

import * as React from 'react';
import cn from 'classnames';
import { useChangePasswordMutation } from '@framework/acccount/change-password';
import { useTranslation } from 'src/app/i18n/client';
import { ERP_STATIC } from '@framework/utils/static';

export default function ChangePasswordClient({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { mutateAsync, isPending } = useChangePasswordMutation();

  // Get email from ERP_STATIC (set after login)
  const userEmail = ERP_STATIC.username || '';

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);

  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const canSubmit = currentPassword && newPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!canSubmit) {
      setError(t('text-fill-required-fields'));
      return;
    }
    try {
      const res = await mutateAsync({
        username: userEmail, // Still pass for backwards compatibility but not used
        currentPassword,
        password: newPassword,
      });
      setSuccess(res.message || t('text-password-changed'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || t('text-change-password-failed'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={onSubmit}
        className="rounded-md border border-gray-200 bg-white p-5 sm:p-6"
      >
        <h1 className="mb-4 text-lg font-semibold text-gray-900">
          {t('CHANGE_PASSWORD')}
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

        {/* Email (read-only, for user reference) */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-700">
            {t('text-email-label')} *
          </label>
          <input
            type="email"
            autoComplete="username"
            value={userEmail}
            readOnly
            disabled
            className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
          />
        </div>

        {/* Current Password */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-700">
            {t('text-current-password')} *
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={`${t('text-current-password')} *`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showCurrent ? t('HIDE') : t('SHOW')}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="mb-1 block text-sm text-gray-700">
            {t('text-new-password')} *
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`${t('text-new-password')} *`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showNew ? t('HIDE') : t('SHOW')}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className={cn(
            'mt-5 inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white',
            (!canSubmit || isPending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isPending ? t('text-saving') : t('CHANGE_PASSWORD')}
        </button>
      </form>
    </div>
  );
}
