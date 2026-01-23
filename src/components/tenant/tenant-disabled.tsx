'use client';

import { usePathname } from 'next/navigation';
import { useTranslation } from 'src/app/i18n/client';

const TenantDisabled: React.FC = () => {
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'it';
  const { t } = useTranslation(lang, 'common');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16 text-center">
      <div className="max-w-lg">
        {/* Pause/Disabled Icon */}
        <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-16 w-16 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-3xl font-bold text-gray-800">
          {t('tenant-disabled-title', {
            defaultValue: 'Service Not Active',
          })}
        </h1>

        {/* Message */}
        <p className="mb-6 text-lg leading-relaxed text-gray-600">
          {t('tenant-disabled-message', {
            defaultValue:
              'Access to this portal has been temporarily suspended. For information on reactivation, please contact your sales representative.',
          })}
        </p>

        {/* Additional info */}
        <p className="text-sm text-gray-500">
          {t('tenant-disabled-contact', {
            defaultValue:
              'If you believe this is an error, please contact support.',
          })}
        </p>
      </div>
    </div>
  );
};

export default TenantDisabled;
