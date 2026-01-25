'use client';

import { useState } from 'react';
import Input from '@components/ui/form/input';
import PasswordInput from '@components/ui/form/password-input';
import Button from '@components/ui/button';
import { useForm } from 'react-hook-form';
import { useLoginMutation, LoginInputType } from '@framework/auth/use-login';
import Logo from '@components/ui/logo';
import { useTranslation } from 'src/app/i18n/client';
import { useModalAction } from '@components/common/modal/modal.context';
import { useHomeSettingsContext } from '@contexts/home-settings.context';
import Switch from '@components/ui/switch';
import CloseButton from '@components/ui/close-button';
import cn from 'classnames';

interface LoginFormProps {
  lang: string;
  isPopup?: boolean;
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  lang,
  isPopup = true,
  className,
}) => {
  const { t } = useTranslation(lang, ['common', 'forms']);
  const { closeModal, openModal } = useModalAction();
  const homeSettings = useHomeSettingsContext();
  const [loginError, setLoginError] = useState<string | null>(null);
  const { mutate: login, isPending } = useLoginMutation(closeModal);
  const [remember, setRemember] = useState(false);

  // Get company branding
  const branding = homeSettings?.settings?.branding;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputType>();

  function onSubmit({ email, password, remember_me }: LoginInputType) {
    setLoginError(null);
    login(
      { email, password, remember_me },
      {
        onError: () => {
          setLoginError(t('error-invalid-credentials') as string);
        },
      },
    );
  }

  function handleSignUp() {
    return openModal('SIGN_UP_VIEW');
  }

  function handleForgetPassword() {
    return openModal('FORGET_PASSWORD');
  }

  return (
    <div className={cn('w-full md:w-[420px] relative', className)}>
      {isPopup === true && <CloseButton onClick={closeModal} />}

      <div className="flex flex-col mx-auto overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="px-6 pt-8 pb-6 text-center">
          <div
            onClick={closeModal}
            className="inline-block mb-4 cursor-pointer"
          >
            <Logo className="h-10 w-auto mx-auto" />
          </div>
          {branding?.title && (
            <p className="text-sm font-medium text-gray-600 mb-3">
              {branding.title}
            </p>
          )}
          <h4 className="text-2xl font-bold text-gray-900 mb-1">
            {t('text-welcome-back')}
          </h4>
          <p className="text-gray-500 text-sm">
            {t("text-don't-have-account")}{' '}
            <button
              type="button"
              className="font-semibold text-brand hover:text-brand-dark transition-colors focus:outline-none"
              onClick={handleSignUp}
            >
              {t('text-create-account')}
            </button>
          </p>
        </div>

        <div className="px-6 pb-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col"
            noValidate
          >
            {loginError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {loginError}
              </div>
            )}
            <div className="flex flex-col space-y-4">
              <Input
                label={t('forms:label-email') as string}
                type="email"
                variant="solid"
                {...register('email', {
                  required: `${t('forms:email-required')}`,
                  pattern: {
                    value:
                      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    message: t('forms:email-error'),
                  },
                })}
                error={errors.email?.message}
                lang={lang}
              />
              <PasswordInput
                label={t('forms:label-password') as string}
                error={errors.password?.message}
                {...register('password', {
                  required: `${t('forms:password-required')}`,
                })}
                lang={lang}
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <label className="relative inline-block cursor-pointer switch">
                    <Switch checked={remember} onChange={setRemember} />
                  </label>
                  <label
                    onClick={() => setRemember(!remember)}
                    className="text-sm cursor-pointer text-gray-600 ltr:pl-2.5 rtl:pr-2.5 select-none"
                  >
                    {t('forms:label-remember-me')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgetPassword}
                  className="text-sm text-brand hover:text-brand-dark transition-colors focus:outline-none"
                >
                  {t('text-forgot-password')}
                </button>
              </div>
              <Button
                type="submit"
                loading={isPending}
                disabled={isPending}
                className="w-full mt-2 h-12 text-base font-semibold rounded-lg"
                variant="formButton"
              >
                {t('text-sign-in')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
