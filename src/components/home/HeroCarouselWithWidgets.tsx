'use client';

import { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import BannerAllCarousel from '@components/common/banner-all-carousel';

type Slide = {
  id: string;
  image: string;
  mobileImage?: string;
  alt?: string;
  title?: string;
  description?: string;
  link?: string;
  openInNewTab?: boolean;
  cardStyle?: Record<string, any>;
};

type HeroCarouselWithWidgetsProps = {
  slides: Slide[];
  lang: string;
  breakpoints?: Record<string, unknown>;
  className?: string;
  widgets?: {
    clock?: {
      enabled?: boolean;
      timezone?: string;
      showWeather?: boolean;
      weatherLocation?: string;
    };
    calendar?: {
      enabled?: boolean;
      highlightToday?: boolean;
    };
  };
};

const formatDayNames = (lang: string, date: Date) => {
  const formatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) =>
    formatter
      .format(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + index)))
      .replace('.', '')
      .toUpperCase()
  );
};

const buildCalendar = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
};

const DEFAULT_BREAKPOINTS = {
  1536: { slidesPerView: 2, spaceBetween: 20 },
  1280: { slidesPerView: 2, spaceBetween: 20 },
  1024: { slidesPerView: 2, spaceBetween: 20 },
  768: { slidesPerView: 2, spaceBetween: 16 },
  520: { slidesPerView: 1, spaceBetween: 12 },
  0: { slidesPerView: 1, spaceBetween: 8 }
};

export const HeroCarouselWithWidgets = ({
  slides,
  lang,
  breakpoints,
  className,
  widgets
}: HeroCarouselWithWidgetsProps) => {
  const [initialDate] = useState(() => new Date());
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const clockConfig = widgets?.clock ?? {};
  const calendarConfig = widgets?.calendar ?? {};

  const timeZone = clockConfig.timezone || undefined;

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        hour: '2-digit',
        minute: '2-digit',
        ...(timeZone ? { timeZone } : {})
      }),
    [lang, timeZone]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(timeZone ? { timeZone } : {})
      }),
    [lang, timeZone]
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        month: 'long',
        year: 'numeric',
        ...(timeZone ? { timeZone } : {})
      }),
    [lang, timeZone]
  );

  const activeDate = now ?? initialDate;

  const timeString = now ? timeFormatter.format(now) : '--:--';
  const dateString = dateFormatter.format(activeDate);
  const monthLabel = monthFormatter.format(activeDate);
  const dayNames = useMemo(() => formatDayNames(lang, activeDate), [lang, activeDate]);
  const calendarWeeks = useMemo(() => buildCalendar(activeDate), [activeDate]);

  const timeZoneLabel = clockConfig.weatherLocation?.trim() || clockConfig.timezone || 'Local time';
  const clockEnabled = clockConfig.enabled !== false;
  const calendarEnabled = calendarConfig.enabled !== false;
  const showWidgets = clockEnabled || calendarEnabled;

  const effectiveBreakpoints = (breakpoints && Object.keys(breakpoints).length > 0)
    ? breakpoints
    : DEFAULT_BREAKPOINTS;

  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);
  const [widgetHeight, setWidgetHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const carouselEl = document.querySelector<HTMLDivElement>('[data-hero-carousel]');
    const widgetsEl = showWidgets
      ? document.querySelector<HTMLDivElement>('[data-hero-widgets]')
      : null;

    if (!carouselEl) return;
    if (!widgetsEl) {
      setWidgetHeight(null);
    }

    const measure = () => {
      const carouselRect = carouselEl.getBoundingClientRect();
      const widgetsRect = widgetsEl?.getBoundingClientRect();
      setCarouselHeight(carouselRect.height);
      setWidgetHeight(widgetsRect?.height ?? null);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(carouselEl);
    if (widgetsEl) {
      resizeObserver.observe(widgetsEl);
    }

    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [slides, lang, breakpoints, showWidgets]);

  const computedHeight = widgetHeight && widgetHeight > 0 ? widgetHeight : carouselHeight;
  const carouselStyle = computedHeight ? { minHeight: computedHeight } : undefined;

  return (
    <div
      className={cn(
        'relative w-full grid gap-6',
        showWidgets && 'md:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]',
        'items-start',
        className
      )}
    >
      <div
        className="h-full overflow-hidden"
        data-hero-carousel
        style={carouselStyle}
      >
        <BannerAllCarousel
          data={slides}
          lang={lang}
          breakpoints={effectiveBreakpoints}
          className="mb-0 h-full"
          itemKeyPrefix="hero-carousel"
          forceFullHeight
          prevButtonClassName="top-1/2 -translate-y-1/2 z-30"
          nextButtonClassName="top-1/2 -translate-y-1/2 z-30"
        />
      </div>
      {showWidgets ? (
        <div className="hidden flex-col gap-4 md:flex" data-hero-widgets>
          {clockEnabled ? (
            <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 p-6 text-white shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.3rem] opacity-70">
                {timeZoneLabel}
              </div>
              <div className="mt-2 text-4xl font-semibold md:text-5xl">{timeString}</div>
              <div className="text-sm capitalize opacity-80">{dateString}</div>
              {clockConfig.showWeather && clockConfig.weatherLocation ? (
                <div className="mt-3 text-xs uppercase tracking-wide text-white/85">
                  {clockConfig.weatherLocation}
                </div>
              ) : null}
            </div>
          ) : null}

          {calendarEnabled ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.3rem] text-slate-500">
                  {monthLabel}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-y-3 gap-x-1 text-center text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
                {dayNames.map((name) => (
                  <div key={name}>{name}</div>
                ))}
                {calendarWeeks.flat().map((day, index) => {
                  const isToday = day === activeDate.getDate();
                  const highlight = calendarConfig.highlightToday !== false;
                  return (
                    <div
                      key={`day-${index}`}
                      className={cn(
                        'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors md:h-9 md:w-9',
                        day == null && 'text-transparent',
                        day != null && !isToday && 'text-slate-700',
                        day != null && isToday && highlight && 'bg-sky-500 text-white font-semibold shadow-sm'
                      )}
                    >
                      {day ?? ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default HeroCarouselWithWidgets;
