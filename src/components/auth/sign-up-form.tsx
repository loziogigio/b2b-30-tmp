'use client';

import { useState } from 'react';
import Input from '@components/ui/form/input';
import Button from '@components/ui/button';
import { useForm } from 'react-hook-form';
import Logo from '@components/ui/logo';
import { useModalAction } from '@components/common/modal/modal.context';
import CloseButton from '@components/ui/close-button';
import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';
import {
  useRegistrationRequestMutation,
  RegistrationRequestInputType,
} from '@framework/auth/use-registration-request';

interface RegistrationRequestFormProps {
  lang: string;
  isPopup?: boolean;
  className?: string;
}

export default function SignUpForm({
  lang,
  isPopup = true,
  className,
}: RegistrationRequestFormProps) {
  const { t } = useTranslation(lang, ['common', 'forms']);
  const { mutate: submitRequest, isPending } = useRegistrationRequestMutation();
  const { closeModal } = useModalAction();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegistrationRequestInputType>();

  function onSubmit(data: RegistrationRequestInputType) {
    submitRequest(data, {
      onSuccess: () => {
        setIsSubmitted(true);
        reset();
      },
    });
  }

  // Success state after submission
  if (isSubmitted) {
    return (
      <div
        className={cn(
          'flex mx-auto rounded-lg md:w-[480px] lg:w-[540px]',
          className,
        )}
      >
        {isPopup && <CloseButton onClick={closeModal} />}
        <div className="flex w-full mx-auto overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5">
          <div className="w-full py-10 px-4 sm:px-8 md:px-10 rounded-md shadow-dropDown flex flex-col justify-center items-center text-center">
            <div className="mb-6">
              <Logo />
            </div>
            <div className="w-16 h-16 mb-4 rounded-full bg-green-100 flex items-center justify-center">
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
            <h4 className="text-xl font-semibold text-brand-dark sm:text-2xl mb-3">
              {t('common:registration-request-sent')}
            </h4>
            <p className="text-sm text-body mb-6 max-w-sm">
              {t('common:registration-request-sent-description')}
            </p>
            <Button
              onClick={closeModal}
              className="w-full max-w-xs tracking-normal h-11 md:h-12"
              variant="formButton"
            >
              {t('common:text-close')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex mx-auto rounded-lg md:w-[560px] lg:w-[640px]',
        className,
      )}
    >
      {isPopup && <CloseButton onClick={closeModal} />}
      <div className="flex w-full mx-auto overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5">
        <div className="w-full py-6 sm:py-10 px-4 sm:px-8 md:px-10 rounded-md shadow-dropDown flex flex-col justify-center">
          <div className="text-center mb-6 pt-2.5">
            <div onClick={closeModal} className="flex justify-center">
              <Logo />
            </div>
            <h4 className="text-xl font-semibold text-brand-dark sm:text-2xl sm:pt-3">
              {t('common:registration-request-title')}
            </h4>
            <p className="mt-2 text-sm text-body">
              {t('common:registration-request-subtitle')}
            </p>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col justify-center"
            noValidate
          >
            <div className="flex flex-col space-y-3">
              <Input
                label={t('forms:label-company-name') as string}
                type="text"
                variant="solid"
                {...register('company_name', {
                  required: t('forms:company-name-required') as string,
                })}
                error={errors.company_name?.message}
                lang={lang}
              />
              <Input
                label={t('forms:label-email') as string}
                type="email"
                variant="solid"
                {...register('email', {
                  required: t('forms:email-required') as string,
                  pattern: {
                    value:
                      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    message: t('forms:email-error') as string,
                  },
                })}
                error={errors.email?.message}
                lang={lang}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t('forms:label-city') as string}
                  type="text"
                  variant="solid"
                  {...register('city', {
                    required: t('forms:city-required') as string,
                  })}
                  error={errors.city?.message}
                  lang={lang}
                />
                <Input
                  label={t('forms:label-phone') as string}
                  type="tel"
                  variant="solid"
                  {...register('phone', {
                    required: t('forms:phone-required') as string,
                  })}
                  error={errors.phone?.message}
                  lang={lang}
                />
              </div>
              <Input
                label={t('forms:label-address') as string}
                type="text"
                variant="solid"
                {...register('address', {
                  required: t('forms:address-required') as string,
                })}
                error={errors.address?.message}
                lang={lang}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t('forms:label-vat-number') as string}
                  type="text"
                  variant="solid"
                  {...register('vat_number', {
                    required: t('forms:vat-number-required') as string,
                  })}
                  error={errors.vat_number?.message}
                  lang={lang}
                />
                <Input
                  label={t('forms:label-sdi-code') as string}
                  type="text"
                  variant="solid"
                  {...register('sdi_code')}
                  error={errors.sdi_code?.message}
                  lang={lang}
                />
              </div>
              <Input
                label={t('forms:label-notes') as string}
                type="text"
                variant="solid"
                {...register('notes')}
                error={errors.notes?.message}
                lang={lang}
              />
              <div className="relative pt-2">
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={isPending}
                  className="w-full tracking-normal h-11 md:h-12 font-15px md:font-15px"
                  variant="formButton"
                >
                  {t('common:registration-request-submit')}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
