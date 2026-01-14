import { IoCheckmarkCircle } from 'react-icons/io5';
import { useTranslation } from 'src/app/i18n/client';

export default function OrderInformation({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');

  return (
    <div className="py-16 xl:px-32 2xl:px-44 3xl:px-56 lg:py-20">
      <div className="flex items-center justify-start px-4 py-4 text-sm border rounded-md border-border-base bg-fill-secondary lg:px-5 text-brand-dark md:text-base">
        <span className="flex items-center justify-center w-10 h-10 rounded-full ltr:mr-3 rtl:ml-3 lg:ltr:mr-4 lg:rtl:ml-4 bg-brand bg-opacity-20 shrink-0">
          <IoCheckmarkCircle className="w-5 h-5 text-brand" />
        </span>
        {t('text-order-received')}
      </div>
    </div>
  );
}
