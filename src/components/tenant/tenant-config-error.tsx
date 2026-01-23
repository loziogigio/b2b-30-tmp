'use client';

import { usePathname } from 'next/navigation';
import { useTranslation } from 'src/app/i18n/client';

interface TenantConfigErrorProps {
  errorType?: 'missing_api' | 'invalid_config' | 'general';
  details?: string;
}

const TenantConfigError: React.FC<TenantConfigErrorProps> = ({
  errorType = 'general',
  details,
}) => {
  const pathname = usePathname();
  const lang = pathname?.split('/')[1] || 'it';
  const { t } = useTranslation(lang, 'common');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16 text-center">
      <div className="max-w-md">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-12 w-12 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {t('tenant-config-error-title', {
            defaultValue: 'Configuration Error',
          })}
        </h1>

        {/* Message */}
        <p className="mb-6 text-lg leading-relaxed text-gray-600">
          {t('tenant-config-error-message', {
            defaultValue:
              'The system configuration is incomplete. Please contact the administrator to verify the portal settings.',
          })}
        </p>

        {/* Details for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && details && (
          <div className="mt-4 rounded-lg bg-gray-100 p-4 text-left">
            <p className="text-sm font-medium text-gray-700">Debug info:</p>
            <p className="mt-1 font-mono text-xs text-gray-500">{details}</p>
          </div>
        )}

        {/* Additional info */}
        <p className="text-sm text-gray-500">
          {t('tenant-config-error-contact', {
            defaultValue:
              'If the problem persists, please contact technical support.',
          })}
        </p>
      </div>
    </div>
  );
};

export default TenantConfigError;
