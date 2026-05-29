'use client';

import type { HeaderWidget } from '@/lib/home-settings/types';
import { HeaderWidgetRenderer } from '@/layouts/header/header-widget-renderer';
import { TimeSearchWidget } from './widgets/time-search-widget';
import { TimeCategoryMenuWidget } from './widgets/time-category-menu-widget';
import {
  TimeFavoritesWidget,
  TimeRemindersWidget,
  TimeCompareWidget,
  TimeProfileWidget,
  TimeNoPriceWidget,
} from './widgets/time-header-utils';

interface TimeHeaderWidgetRendererProps {
  widget: HeaderWidget;
  lang: string;
}

// Time-theme widget renderer. Only the widgets the DFL restyle actually changes
// get a dedicated time component here; every other widget type falls through to
// the shared renderer so we don't duplicate (or risk drifting from) the default
// implementations.
export function TimeHeaderWidgetRenderer({
  widget,
  lang,
}: TimeHeaderWidgetRendererProps) {
  switch (widget.type) {
    case 'search-bar':
    case 'search':
      return <TimeSearchWidget config={widget.config} lang={lang} />;

    case 'favorites':
      return <TimeFavoritesWidget config={widget.config} lang={lang} />;

    case 'reminders':
    case 'promemoria':
      return <TimeRemindersWidget config={widget.config} lang={lang} />;

    case 'compare':
      return <TimeCompareWidget config={widget.config} lang={lang} />;

    case 'no-price':
      return <TimeNoPriceWidget config={widget.config} lang={lang} />;

    case 'category-menu':
    case 'categories':
      return <TimeCategoryMenuWidget config={widget.config} lang={lang} />;

    case 'profile':
      return <TimeProfileWidget config={widget.config} lang={lang} />;

    default:
      return <HeaderWidgetRenderer widget={widget} lang={lang} />;
  }
}
