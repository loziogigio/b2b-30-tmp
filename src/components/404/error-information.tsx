'use client';

import HomeIcon from '@components/icons/home-icon';
import NotFoundIcon from '@components/icons/not-found';
import { ROUTES } from '@utils/routes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'src/app/i18n/client';

const ErrorInformation: React.FC = () => {
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'it';
  const { t } = useTranslation(lang, 'common');

  return (
    <div className="flex min-h-screen items-center justify-center px-12 py-16 text-center sm:py-20 lg:py-24 xl:py-32">
      <div className="max-w-md xl:max-w-lg">
        <NotFoundIcon className="h-[410px] w-full" />
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          {t('text-page-not-found', {
            defaultValue: 'Pagina non trovata',
          })}
        </h1>
        <p className="text-15px pb-7 pt-4 font-medium leading-7 text-gray-600 md:text-base md:leading-8 2xl:text-[18px]">
          {t('text-404-message', {
            defaultValue:
              'Ci dispiace! Questa pagina non è al momento disponibile. Ti preghiamo di riprovare più tardi.',
          })}
        </p>
        <Link
          href={ROUTES.HOME}
          className="inline-flex cursor-pointer items-center rounded-md bg-brand-dark bg-opacity-90 px-4 py-2.5 text-[13px] font-medium leading-4 text-white transition duration-300 ease-in-out hover:bg-opacity-100 hover:text-white md:px-6 md:text-sm lg:py-3 lg:text-[15px]"
        >
          <HomeIcon width="14" />
          <span className="mt-0.5 ps-2">
            {t('text-back-to-home', { defaultValue: 'Torna alla Home' })}
          </span>
        </Link>
      </div>
    </div>
  );
};

export default ErrorInformation;
