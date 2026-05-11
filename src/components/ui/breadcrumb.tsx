'use client';

import React from 'react';
import NextLink from 'next/link';
import useBreadcrumb, { convertBreadcrumbTitle } from '@utils/use-breadcrumb';
import { IoChevronForward } from 'react-icons/io5';
import { HiOutlineHome } from 'react-icons/hi';
import { useTranslation } from 'src/app/i18n/client';

const PILL_BASE =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium max-w-[18rem] truncate transition-colors';
const PILL_NEUTRAL = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
const PILL_ACTIVE = 'bg-brand text-white cursor-default';

const Breadcrumb: React.FC<{ separator?: React.ReactNode; lang: string }> = ({
  lang,
}) => {
  const breadcrumbs = useBreadcrumb();
  const { t } = useTranslation(lang, 'common');
  const items = breadcrumbs ?? [];
  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center mb-3">
      <ol className="flex items-center w-full gap-1.5 overflow-hidden whitespace-nowrap min-w-0">
        <li className="shrink-0">
          <NextLink
            href={`/${lang}`}
            aria-label="Home"
            className={`${PILL_BASE} ${PILL_NEUTRAL}`}
          >
            <HiOutlineHome className="text-base" aria-hidden="true" />
          </NextLink>
        </li>

        {items.map((breadcrumb: any, idx: number) => {
          const isLast = idx === lastIndex;
          const breadcrumbText = convertBreadcrumbTitle(breadcrumb.breadcrumb);
          const translationKey = `breadcrumb-${breadcrumbText.replace(/\s+/g, '-')}`;
          const translatedText = t(translationKey, {
            defaultValue: breadcrumbText,
          });

          return (
            <React.Fragment key={breadcrumb.href}>
              <li className="shrink-0 text-gray-400" aria-hidden="true">
                <IoChevronForward className="text-base" />
              </li>
              <li className="min-w-0">
                {isLast ? (
                  <span
                    aria-current="page"
                    title={translatedText}
                    className={`${PILL_BASE} ${PILL_ACTIVE} capitalize`}
                  >
                    {translatedText}
                  </span>
                ) : (
                  <NextLink
                    href={breadcrumb.href}
                    title={translatedText}
                    className={`${PILL_BASE} ${PILL_NEUTRAL} capitalize`}
                  >
                    {translatedText}
                  </NextLink>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
