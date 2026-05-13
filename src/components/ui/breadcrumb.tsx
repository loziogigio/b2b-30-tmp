'use client';

import React from 'react';
import NextLink from 'next/link';
import useBreadcrumb, { convertBreadcrumbTitle } from '@utils/use-breadcrumb';
import { IoChevronForward } from 'react-icons/io5';
import { HiOutlineHome } from 'react-icons/hi';
import { useTranslation } from 'src/app/i18n/client';

const ITEM_BASE =
  'inline-flex items-center gap-1.5 text-sm max-w-[18rem] truncate transition-colors';
const ITEM_LINK = 'text-gray-500 hover:text-gray-700 hover:underline';
const ITEM_ACTIVE = 'text-gray-700 font-medium cursor-default';

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
            className={`${ITEM_BASE} ${ITEM_LINK}`}
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
              <li className="shrink-0 text-gray-300" aria-hidden="true">
                <IoChevronForward className="text-sm" />
              </li>
              <li className="min-w-0">
                {isLast ? (
                  <span
                    aria-current="page"
                    title={translatedText}
                    className={`${ITEM_BASE} ${ITEM_ACTIVE} capitalize`}
                  >
                    {translatedText}
                  </span>
                ) : (
                  <NextLink
                    href={breadcrumb.href}
                    title={translatedText}
                    className={`${ITEM_BASE} ${ITEM_LINK} capitalize`}
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
