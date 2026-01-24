'use client';

import Logo from '@components/ui/logo';
import LocationIcon from '@components/icons/contact/location-icon';
import PhoneIcon from '@components/icons/contact/phone-icon';
import MailIcon from '@components/icons/contact/mail-icon';
import { useTranslation } from 'src/app/i18n/client';
import { useHomeSettings } from '@/hooks/use-home-settings';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface FooterProps {
  variant?: 'default' | 'medium';
  lang: string;
}

const Footer: React.FC<FooterProps> = ({ variant = 'default', lang }) => {
  const { t } = useTranslation(lang, 'footer');
  const { settings } = useHomeSettings();
  const year = new Date().getFullYear();

  const containerClassName =
    variant === 'default'
      ? 'mx-auto max-w-[1920px] px-4 md:px-6 lg:px-8 2xl:px-10'
      : '';

  const branding = settings?.branding;
  const footerHtml = settings?.footerHtml;

  // Dynamic colors from branding (fallback to defaults)
  const footerBgColor = branding?.footerBackgroundColor || '#f5f5f5';
  const footerTextColor = branding?.footerTextColor || '#666666';
  const companyTitle = branding?.title || 'B2B Store';

  // Render custom footer HTML if configured
  if (footerHtml) {
    return (
      <footer className="mt-[50px] lg:mt-14 2xl:mt-16">
        <div
          className="border-t-[6px] border-brand"
          style={{ backgroundColor: footerBgColor, color: footerTextColor }}
        >
          <div className={`${containerClassName} py-8 lg:py-10`}>
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(footerHtml) }}
            />
          </div>

          <div className="bg-brand py-3 text-center text-xs font-semibold text-white md:text-sm">
            Copyright &copy; {year} {companyTitle}. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }

  // Fallback to default footer (for tenants without custom footerHtml)
  return (
    <footer className="mt-[50px] lg:mt-14 2xl:mt-16">
      <div
        className="border-t-[6px] border-brand"
        style={{ backgroundColor: footerBgColor, color: footerTextColor }}
      >
        <div className={`${containerClassName} py-8 lg:py-10`}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between xl:gap-12">
            <div className="flex items-center gap-4 sm:gap-5">
              <Logo className="h-[80px] w-auto" variant="gray" />
              <div
                className="leading-[100%] text-[40px] text-[#7a7a7a]"
                style={{ fontFamily: 'Helvetica, sans-serif' }}
              >
                <div className="font-bold">{companyTitle.split(' ')[0]}</div>
                <div className="font-normal">
                  {companyTitle.split(' ').slice(1).join(' ') || 'Store'}
                </div>
              </div>
            </div>

            <div
              className="flex flex-col gap-3 text-sm leading-relaxed lg:max-w-[520px] lg:text-base"
              style={{ color: footerTextColor }}
            >
              <div className="flex items-start gap-3">
                <LocationIcon className="mt-[2px] h-5 w-5 flex-shrink-0" />
                <span>{t('text-address')}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 flex-shrink-0" />
                <a
                  href="tel:+3908231872900"
                  className="transition-colors duration-200 hover:text-brand"
                >
                  {t('text-phone')}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MailIcon className="h-5 w-5 flex-shrink-0" />
                <a
                  href="mailto:info@example.com"
                  className="transition-colors duration-200 hover:text-brand"
                >
                  {t('text-email')}
                </a>
              </div>
            </div>

            <div
              className="text-center text-sm lg:text-right lg:text-base"
              style={{ color: footerTextColor }}
            >
              <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#7a7a7a]">
                {t('text-opening-title')}
              </div>
              <div className="mt-3">
                <span>{t('text-opening-week')}</span>{' '}
                <span className="font-semibold">
                  {t('text-opening-week-hours')}
                </span>
              </div>
              <div className="mt-1">
                <span>{t('text-opening-saturday')}</span>{' '}
                <span className="font-semibold">
                  {t('text-opening-saturday-hours')}
                </span>
              </div>
            </div>
          </div>

          <hr className="my-8 border-t border-[#b3b3b3]" />

          <div className="text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-[#7a7a7a]">
            {t('text-legal-info')}
          </div>
        </div>

        <div className="bg-brand py-3 text-center text-xs font-semibold text-white md:text-sm">
          Copyright &copy; {year} {companyTitle}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
