import { useState } from 'react';
import Button from '@components/ui/button';
import Input from '@components/ui/form/input';
import Logo from '@components/ui/logo';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'src/app/i18n/client';
import { useModalAction } from '@components/common/modal/modal.context';
import CloseButton from '@components/ui/close-button';

type FormValues = {
  email: string;
};

const defaultValues = {
  email: '',
};

const ForgetPasswordForm = ({ lang }: { lang: string }) => {
  const { t } = useTranslation(lang, ['common', 'forms']);
  const { closeModal, openModal } = useModalAction();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  function handleSignIn() {
    return openModal('LOGIN_VIEW');
  }

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || t('common:error-reset-password'));
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(t('common:error-reset-password'));
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full px-5 py-6 mx-auto rounded-lg sm:p-8 bg-white shadow-2xl ring-1 ring-black/5 sm:w-96 md:w-450px">
        <CloseButton onClick={closeModal} />
        <div className="text-center pt-2.5">
          <div onClick={closeModal}>
            <Logo />
          </div>
          <div className="w-16 h-16 mx-auto mt-6 mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-brand-dark mb-3">
            {t('common:reset-password-sent-title')}
          </h4>
          <p className="text-sm text-body mb-6">
            {t('common:reset-password-sent-description')}
          </p>
          <Button
            onClick={handleSignIn}
            variant="formButton"
            className="w-full h-11 md:h-12"
          >
            {t('common:text-back-to-login')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-5 py-6 mx-auto rounded-lg sm:p-8 bg-white shadow-2xl ring-1 ring-black/5 sm:w-96 md:w-450px">
      <CloseButton onClick={closeModal} />
      <div className="text-center mb-9 pt-2.5">
        <div onClick={closeModal}>
          <Logo />
        </div>
        <p className="mt-3 mb-8 text-sm md:text-base text-body sm:mt-4 sm:mb-10">
          {t('common:forgot-password-helper')}
        </p>
      </div>
      <form
        onSubmit={handleSubmit((data) => onSubmit(data))}
        className="flex flex-col justify-center"
        noValidate
      >
        <Input
          label={t('forms:label-email') as string}
          type="email"
          variant="solid"
          className="mb-4"
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

        {error && (
          <p className="mb-4 text-sm text-red-500 text-center">{error}</p>
        )}

        <Button
          type="submit"
          variant="formButton"
          className="w-full mt-0 h-11 md:h-12"
          loading={isLoading}
          disabled={isLoading}
        >
          {t('common:text-reset-password')}
        </Button>
      </form>
      <div className="relative flex flex-col items-center justify-center mt-8 mb-6 text-sm text-heading sm:mt-10 sm:mb-7">
        <hr className="w-full border-gray-300" />
        <span className="absolute -top-2.5 px-2 bg-white">
          {t('common:text-or')}
        </span>
      </div>
      <div className="text-sm text-center sm:text-15px text-brand-muted">
        {t('common:text-back-to')}{' '}
        <button
          type="button"
          className="font-medium underline text-brand-dark hover:no-underline focus:outline-none"
          onClick={handleSignIn}
        >
          {t('common:text-login')}
        </button>
      </div>
    </div>
  );
};

export default ForgetPasswordForm;
