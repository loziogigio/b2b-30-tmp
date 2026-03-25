'use client';

import Link from '@components/ui/link';
import { useTranslation } from 'src/app/i18n/client';
import { useHomeSettings } from '@/hooks/use-home-settings';

interface TimeFooterProps {
  lang: string;
}

export default function TimeFooter({ lang }: TimeFooterProps) {
  const { t } = useTranslation(lang, 'footer');
  const { settings } = useHomeSettings();
  const year = new Date().getFullYear();
  const companyTitle = settings?.branding?.title || 'B2B Store';

  return (
    <footer className="mt-12 lg:mt-16">
      <div className="bg-[var(--time-dark)] text-white/50 text-xs font-[family-name:var(--font-body)]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>
            &copy; {year} {companyTitle}
          </span>
          <div className="flex gap-5">
            <Link
              href={`/${lang}/terms`}
              className="hover:text-white/80 transition-colors cursor-pointer"
            >
              {t('text-terms', { defaultValue: "Condizioni d'uso" })}
            </Link>
            <Link
              href={`/${lang}/privacy`}
              className="hover:text-white/80 transition-colors cursor-pointer"
            >
              {t('text-privacy', { defaultValue: 'Privacy' })}
            </Link>
            <Link
              href={`/${lang}/contact-us`}
              className="hover:text-white/80 transition-colors cursor-pointer"
            >
              {t('text-contact', { defaultValue: 'Contatti' })}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
