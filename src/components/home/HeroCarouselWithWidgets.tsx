'use client';

import { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import BannerAllCarousel from '@components/common/banner-all-carousel';
import { WeatherWidget } from './WeatherWidget';

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
    weather?: {
      enabled?: boolean;
    };
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

const resolveLocale = (lang?: string) => {
  const supported = ['it', 'en'];
  if (!lang) return 'it';
  const normalized = lang.split('-')[0]?.toLowerCase();
  if (supported.includes(lang)) return lang;
  if (normalized && supported.includes(normalized)) return normalized;
  try {
    return new Intl.Locale(lang).baseName;
  } catch {
    return 'it';
  }
};

const formatDayNames = (lang: string, date: Date) => {
  const locale = resolveLocale(lang);
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, index) =>
    formatter
      .format(
        new Date(
          Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - date.getDay() + index,
          ),
        ),
      )
      .replace('.', '')
      .toUpperCase(),
  );
};

const buildCalendar = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = Array.from(
    { length: firstDay },
    () => null,
  );
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
  0: { slidesPerView: 1, spaceBetween: 8 },
};

// Skeleton component for loading state
const HeroSkeleton = ({ showWidgets }: { showWidgets: boolean }) => (
  <div
    className={cn(
      'relative w-full grid gap-4 mt-4 h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px]',
      showWidgets && 'lg:grid-cols-[1fr_1fr_minmax(180px,0.3fr)]',
      'items-stretch',
    )}
  >
    {/* Carousel skeleton */}
    <div className="col-span-2 h-full overflow-hidden rounded-xl bg-gray-200 animate-pulse">
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-300" />
      </div>
    </div>
    {/* Widget skeleton */}
    {showWidgets && (
      <div className="hidden lg:flex flex-col gap-3">
        <div className="flex-1 rounded-xl bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-600 animate-pulse" />
      </div>
    )}
  </div>
);

export const HeroCarouselWithWidgets = ({
  slides,
  lang,
  breakpoints,
  className,
  widgets,
}: HeroCarouselWithWidgetsProps) => {
  const [initialDate] = useState(() => new Date());
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const weatherConfig = widgets?.weather ?? {};
  const clockConfig = widgets?.clock ?? {};
  const calendarConfig = widgets?.calendar ?? {};

  // Weather widget is enabled by default, replaces clock and calendar
  const weatherEnabled = weatherConfig.enabled !== false;

  const timeZone = clockConfig.timezone || undefined;

  const timeFormatter = useMemo(() => {
    const locale = resolveLocale(lang);
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    });
  }, [lang, timeZone]);

  const dateFormatter = useMemo(() => {
    const locale = resolveLocale(lang);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(timeZone ? { timeZone } : {}),
    });
  }, [lang, timeZone]);

  const monthFormatter = useMemo(() => {
    const locale = resolveLocale(lang);
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    });
  }, [lang, timeZone]);

  const activeDate = now ?? initialDate;

  const timeString = now ? timeFormatter.format(now) : '--:--';
  const dateString = dateFormatter.format(activeDate);
  const monthLabel = monthFormatter.format(activeDate);
  const dayNames = useMemo(
    () => formatDayNames(lang, activeDate),
    [lang, activeDate],
  );
  const calendarWeeks = useMemo(() => buildCalendar(activeDate), [activeDate]);

  const timeZoneLabel =
    clockConfig.weatherLocation?.trim() || clockConfig.timezone || 'Local time';

  // If weather is enabled, show only the weather widget
  // Otherwise fall back to legacy clock/calendar behavior
  const clockEnabled = !weatherEnabled && clockConfig.enabled !== false;
  const calendarEnabled = !weatherEnabled && calendarConfig.enabled !== false;
  const showWidgets = weatherEnabled || clockEnabled || calendarEnabled;

  const effectiveBreakpoints =
    breakpoints && Object.keys(breakpoints).length > 0
      ? breakpoints
      : DEFAULT_BREAKPOINTS;

  // Show skeleton until component is mounted (hydrated)
  if (!mounted) {
    return <HeroSkeleton showWidgets={showWidgets} />;
  }

  return (
    <div
      className={cn(
        'relative w-full grid gap-4 mt-4 h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px]',
        showWidgets && 'lg:grid-cols-[1fr_1fr_minmax(180px,0.3fr)]',
        'items-stretch',
        className,
      )}
    >
      <div
        className="col-span-2 h-full overflow-hidden rounded-xl"
        data-hero-carousel
      >
        <BannerAllCarousel
          data={slides}
          lang={lang}
          breakpoints={effectiveBreakpoints}
          className="mb-0 h-full"
          itemKeyPrefix="hero-carousel"
          forceFullHeight
          prevButtonClassName="!left-3 md:!left-4 lg:!left-6 top-1/2 -translate-y-1/2 z-30 !w-10 !h-10 md:!w-12 md:!h-12 !bg-white/90 hover:!bg-white !shadow-lg !text-gray-800"
          nextButtonClassName="!right-3 md:!right-4 lg:!right-6 top-1/2 -translate-y-1/2 z-30 !w-10 !h-10 md:!w-12 md:!h-12 !bg-white/90 hover:!bg-white !shadow-lg !text-gray-800"
          style={{ borderRadius: 'md' }}
          cardStyle={{ borderRadius: 'xl' }}
        />
      </div>
      {showWidgets ? (
        <div className="hidden flex-col gap-3 lg:flex" data-hero-widgets>
          {/* Weather Widget - Default, replaces clock and calendar */}
          {weatherEnabled ? (
            <WeatherWidget lang={lang} className="h-full" />
          ) : null}

          {/* Legacy Clock Widget */}
          {clockEnabled ? (
            <div className="flex flex-1 flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 p-4 text-white shadow-sm min-h-[160px] relative overflow-hidden">
              {/* Weather gradient background */}
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/30 via-transparent to-white/10" />
              <div className="relative z-10">
                <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                  {timeZoneLabel}
                </div>
                <div className="mt-1 text-3xl font-light lg:text-4xl">
                  {timeString}
                </div>
                <div className="text-[11px] capitalize opacity-80 mt-1">
                  {dateString}
                </div>
              </div>
              {clockConfig.showWeather && clockConfig.weatherLocation ? (
                <div className="relative z-10 mt-2 text-[10px] uppercase tracking-wide text-white/85">
                  {clockConfig.weatherLocation}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Legacy Calendar Widget */}
          {calendarEnabled ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex-1">
              <div className="flex items-center justify-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  {monthLabel}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[9px] font-medium uppercase text-slate-400">
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
                        'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors',
                        day == null && 'text-transparent',
                        day != null && !isToday && 'text-slate-700',
                        day != null &&
                          isToday &&
                          highlight &&
                          'bg-red-500 text-white font-semibold',
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
