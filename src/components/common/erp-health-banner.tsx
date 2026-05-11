'use client';

import React from 'react';
import { useTranslation } from '@/app/i18n/client';
import { useTenantOptional } from '@contexts/tenant.context';
import { useErpHealth } from '@framework/erp/erp-health';

interface ErpHealthBannerProps {
  lang: string;
}

type ContactLink = { href: string; label: string } | null;

function buildContactLink(
  contact: string | undefined,
  label: string,
): ContactLink {
  if (!contact) return null;
  const value = contact.trim();
  if (!value) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { href: `mailto:${value}`, label };
  }
  if (/^\+?[\d\s().-]{6,}$/.test(value)) {
    return { href: `tel:${value.replace(/\s/g, '')}`, label };
  }
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return { href, label };
}

export function ErpHealthBanner({ lang }: ErpHealthBannerProps) {
  const { unhealthy } = useErpHealth();
  const { t } = useTranslation(lang, 'common');
  const tenantCtx = useTenantOptional();

  if (!unhealthy) return null;

  const tenantName = tenantCtx?.tenant?.name?.trim() || t('breadcrumb-home');
  const supportContact = tenantCtx?.tenant?.supportContact;
  const contactLink = buildContactLink(
    supportContact,
    t('error-erp-profile-contact-cta', { tenant: tenantName }),
  );

  return (
    <div
      role="alert"
      className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-3 text-sm flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 flex-shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold">{t('error-erp-profile-title')}</p>
        <p>{t('error-erp-profile-body', { tenant: tenantName })}</p>
        {contactLink && (
          <p className="mt-1">
            <a className="font-medium underline" href={contactLink.href}>
              {contactLink.label}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default ErpHealthBanner;
