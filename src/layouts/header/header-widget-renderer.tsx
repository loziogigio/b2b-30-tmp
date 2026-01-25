'use client';

import type { HeaderWidget } from '@/lib/home-settings/types';
import {
  LogoWidget,
  SearchWidget,
  RadioWidget,
  CartWidget,
  ProfileWidget,
  FavoritesWidget,
  CompareWidget,
  NoPriceWidget,
  CategoryMenuWidget,
  CompanyInfoWidget,
  ButtonWidget,
  SpacerWidget,
  DividerWidget,
} from './widgets';

interface HeaderWidgetRendererProps {
  widget: HeaderWidget;
  lang: string;
}

export function HeaderWidgetRenderer({
  widget,
  lang,
}: HeaderWidgetRendererProps) {
  switch (widget.type) {
    case 'logo':
      return <LogoWidget config={widget.config} lang={lang} />;

    case 'search-bar':
    case 'search': // Also support 'search' type name
      return <SearchWidget config={widget.config} lang={lang} />;

    case 'radio-widget':
    case 'radio': // Also support 'radio' type name
      return <RadioWidget config={widget.config} lang={lang} />;

    case 'cart':
      return <CartWidget config={widget.config} lang={lang} />;

    case 'profile':
      return <ProfileWidget config={widget.config} lang={lang} />;

    case 'favorites':
      return <FavoritesWidget config={widget.config} lang={lang} />;

    case 'compare':
      return <CompareWidget config={widget.config} lang={lang} />;

    case 'no-price':
      return <NoPriceWidget config={widget.config} lang={lang} />;

    case 'category-menu':
    case 'categories': // Also support 'categories' type name
      return <CategoryMenuWidget config={widget.config} lang={lang} />;

    case 'company-info':
      return <CompanyInfoWidget config={widget.config} lang={lang} />;

    case 'button':
      return <ButtonWidget config={widget.config} lang={lang} />;

    case 'spacer':
      return <SpacerWidget config={widget.config} lang={lang} />;

    case 'divider':
      return <DividerWidget config={widget.config} lang={lang} />;

    default:
      console.warn(`Unknown widget type: ${widget.type}`);
      return null;
  }
}
