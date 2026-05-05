import { ILFlag } from '@components/icons/language/ILFlag';
import { SAFlag } from '@components/icons/language/SAFlag';
import { CNFlag } from '@components/icons/language/CNFlag';
import { USFlag } from '@components/icons/language/USFlag';
import { DEFlag } from '@components/icons/language/DEFlag';
import { ESFlag } from '@components/icons/language/ESFlag';
import { ITFlag } from '@components/icons/language/ITFlag';

// Default logo - override via home-settings from backend
const siteLogo = '/assets/images/logo-placeholder.svg';

export const siteSettings = {
  name: 'VINC B2B',
  description:
    'B2B E-commerce platform built with React, NextJS, TypeScript, TanStack-React-Query and Tailwind CSS.',
  author: {
    name: 'VINC',
    websiteUrl: 'https://vendereincloud.it',
    address: '',
  },
  logo: {
    url: siteLogo,
    alt: 'VINC B2B',
    href: '/it',
    width: 128,
    height: 30,
  },
  defaultLanguage: 'it',
  currencyCode: 'USD',
  site_header: {
    languageMenu: [
      {
        id: 'it',
        name: 'Italiano - IT',
        value: 'it',
        icon: <ITFlag />,
      },
      // {
      //   id: 'ar',
      //   name: 'عربى - AR',
      //   value: 'ar',
      //   icon: <SAFlag />,
      // },
      // {
      //   id: 'zh',
      //   name: '中国人 - ZH',
      //   value: 'zh',
      //   icon: <CNFlag />,
      // },
      {
        id: 'en',
        name: 'English - EN',
        value: 'en',
        icon: <USFlag />,
      },
      {
        id: 'de',
        name: 'Deutsch - DE',
        value: 'de',
        icon: <DEFlag />,
      },
      // {
      //   id: 'he',
      //   name: 'rעברית - HE',
      //   value: 'he',
      //   icon: <ILFlag />,
      // },
      {
        id: 'es',
        name: 'Español - ES',
        value: 'es',
        icon: <ESFlag />,
      },
    ],
  },
};
