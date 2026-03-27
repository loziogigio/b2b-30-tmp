'use client';

import * as React from 'react';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import { useChangePasswordMutation } from '@framework/acccount/change-password';
import { ERP_STATIC } from '@framework/utils/static';
import { TimeCard } from './time-account-primitives';

interface TimeAccountPasswordProps {
  lang: string;
}

export default function TimeAccountPassword({ lang }: TimeAccountPasswordProps) {
  const { t } = useTranslation(lang, 'common');
  const { mutateAsync, isPending } = useChangePasswordMutation();

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
        username: userEmail,
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

  const inputCls =
    'w-full h-[42px] rounded-[var(--radius-btn)] border-[1.5px] border-[var(--time-gray-200)] px-3.5 text-sm font-[var(--font-body)] text-[var(--time-dark)] bg-[var(--time-gray-50)] outline-none transition-all focus:border-[var(--time-red)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.1)]';

  return (
    <TimeCard className="p-8 max-w-[500px]">
      <h3 className="text-lg font-extrabold text-[var(--time-dark)] font-[var(--font-display)] mb-1.5">
        {t('CHANGE_PASSWORD', { defaultValue: 'Cambia Password' })}
      </h3>
      <p className="text-[13px] text-[var(--time-gray-400)] font-[var(--font-body)] mb-6">
        {t('text-change-password-desc', {
          defaultValue: 'Aggiorna la tua password per mantenere il tuo account sicuro.',
        })}
      </p>

      {error && (
        <div className="mb-4 rounded-[var(--radius-btn)] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-[var(--radius-btn)] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--time-gray-600)] font-[var(--font-body)] mb-1.5">
            {t('text-email-label', { defaultValue: 'Email' })}
          </label>
          <input
            type="email"
            autoComplete="username"
            value={userEmail}
            readOnly
            disabled
            className={cn(inputCls, 'opacity-60 cursor-not-allowed')}
          />
        </div>

        {/* Current Password */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--time-gray-600)] font-[var(--font-body)] mb-1.5">
            {t('text-current-password', { defaultValue: 'Password Attuale' })} *
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--time-gray-400)] hover:text-[var(--time-dark)]"
            >
              {showCurrent ? t('HIDE', { defaultValue: 'Nascondi' }) : t('SHOW', { defaultValue: 'Mostra' })}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--time-gray-600)] font-[var(--font-body)] mb-1.5">
            {t('text-new-password', { defaultValue: 'Nuova Password' })} *
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--time-gray-400)] hover:text-[var(--time-dark)]"
            >
              {showNew ? t('HIDE', { defaultValue: 'Nascondi' }) : t('SHOW', { defaultValue: 'Mostra' })}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className={cn(
            'h-11 px-7 rounded-[var(--radius-btn)] bg-[var(--time-dark)] text-white text-[13px] font-bold font-[var(--font-body)] transition-colors hover:bg-[var(--time-red)]',
            (!canSubmit || isPending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isPending
            ? t('text-saving', { defaultValue: 'Salvando...' })
            : t('CHANGE_PASSWORD', { defaultValue: 'Aggiorna Password' })}
        </button>
      </form>
    </TimeCard>
  );
}
