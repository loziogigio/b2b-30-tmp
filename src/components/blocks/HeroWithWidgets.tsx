'use client';

import { useState, useEffect, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface HeroSlide {
  id: string;
  imageDesktop: { url: string; alt: string };
  imageMobile: { url: string; alt: string };
  link?: { url: string; openInNewTab: boolean };
  title?: string;
  description?: string;
}

interface HeroWithWidgetsConfig {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplaySpeed?: number;
  loop?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
  widgets?: {
    clock?: {
      enabled: boolean;
      timezone?: string;
      showWeather?: boolean;
      weatherLocation?: string;
    };
    calendar?: {
      enabled: boolean;
      highlightToday?: boolean;
    };
  };
  layout?: {
    carouselWidth?: string;
    widgetsWidth?: string;
  };
  className?: string;
}

interface HeroWithWidgetsProps {
  config: HeroWithWidgetsConfig;
}

// Clock Widget Component
function ClockWidget({
  timezone,
  showWeather,
  weatherLocation,
}: {
  timezone?: string;
  showWeather?: boolean;
  weatherLocation?: string;
}) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({
    temp: '22',
    condition: 'Partly cloudy',
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const date = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative h-full overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white shadow-lg">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="text-center">
          <div className="text-5xl font-bold tracking-tight">
            {hours}:{minutes}
          </div>
          <div className="mt-1 text-sm font-medium opacity-90">{date}</div>
        </div>

        {showWeather && (
          <div className="mt-4 flex items-center space-x-3 rounded-lg bg-white/10 px-4 py-2 backdrop-blur-sm">
            <div className="text-3xl">☀️</div>
            <div className="text-left">
              <div className="text-2xl font-bold">{weather.temp}°</div>
              <div className="text-xs opacity-75">{weather.condition}</div>
            </div>
          </div>
        )}

        {weatherLocation && (
          <div className="mt-2 text-xs opacity-75">{weatherLocation}</div>
        )}
      </div>
    </div>
  );
}

// Calendar Widget Component
function CalendarWidget({ highlightToday }: { highlightToday?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = currentDate.getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Empty cells for days before the month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white p-4 shadow-lg">
      <div className="mb-3 text-center">
        <div className="text-lg font-bold uppercase tracking-wide text-gray-800">
          {monthName} {year}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-bold text-gray-500"
          >
            {day}
          </div>
        ))}

        {days.map((day, index) => (
          <div
            key={index}
            className={`flex h-8 items-center justify-center rounded text-xs font-medium ${
              day === null
                ? 'text-transparent'
                : highlightToday && day === today
                  ? 'bg-red-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroWithWidgets({ config }: HeroWithWidgetsProps) {
  const {
    slides = [],
    autoplay = true,
    autoplaySpeed = 5000,
    loop = true,
    showDots = true,
    showArrows = true,
    widgets = {},
    layout = {},
    className = '',
  } = config;

  const carouselWidth = layout.carouselWidth || '80%';
  const widgetsWidth = layout.widgetsWidth || '20%';

  const clockEnabled = widgets.clock?.enabled ?? true;
  const calendarEnabled = widgets.calendar?.enabled ?? true;

  const navigationId = useMemo(
    () => Math.random().toString(36).slice(2, 10),
    [],
  );
  const prevButtonId = `hero-widgets-prev-${navigationId}`;
  const nextButtonId = `hero-widgets-next-${navigationId}`;

  if (!slides || slides.length === 0) {
    return (
      <div className="bg-gray-100 p-8 text-center text-gray-500">
        No slides configured for Hero with Widgets
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-4">
        {/* Carousel Section - 80% */}
        <div
          style={{ width: carouselWidth }}
          className="hero-carousel-container relative"
        >
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={
              autoplay
                ? { delay: autoplaySpeed, disableOnInteraction: false }
                : false
            }
            loop={loop}
            pagination={showDots ? { clickable: true } : false}
            navigation={
              showArrows
                ? {
                    prevEl: `#${prevButtonId}`,
                    nextEl: `#${nextButtonId}`,
                  }
                : false
            }
            className="hero-carousel"
          >
            {slides.map((slide) => {
              const slideContent = (
                <div className="relative h-full w-full">
                  {/* Desktop Image */}
                  <img
                    src={slide.imageDesktop.url}
                    alt={slide.imageDesktop.alt || 'Hero slide'}
                    className="hidden h-full w-full object-cover md:block"
                  />
                  {/* Mobile Image */}
                  <img
                    src={slide.imageMobile.url || slide.imageDesktop.url}
                    alt={
                      slide.imageMobile.alt ||
                      slide.imageDesktop.alt ||
                      'Hero slide'
                    }
                    className="block h-full w-full object-cover md:hidden"
                  />
                </div>
              );

              return (
                <SwiperSlide key={slide.id}>
                  {slide.link?.url ? (
                    <a
                      href={slide.link.url}
                      target={slide.link.openInNewTab ? '_blank' : '_self'}
                      rel={
                        slide.link.openInNewTab
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      className="block"
                    >
                      {slideContent}
                    </a>
                  ) : (
                    slideContent
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>
          {showArrows ? (
            <>
              <button
                id={prevButtonId}
                type="button"
                aria-label="Previous slide"
                className="hero-carousel-nav-button hero-carousel-prev swiper-button-prev"
              />
              <button
                id={nextButtonId}
                type="button"
                aria-label="Next slide"
                className="hero-carousel-nav-button hero-carousel-next swiper-button-next"
              />
            </>
          ) : null}
        </div>

        {/* Widgets Section - 20% */}
        <div
          style={{ width: widgetsWidth }}
          className="hidden space-y-4 lg:block"
        >
          {/* Clock Widget */}
          {clockEnabled && (
            <div className="h-[50%]">
              <ClockWidget
                timezone={widgets.clock?.timezone}
                showWeather={widgets.clock?.showWeather}
                weatherLocation={widgets.clock?.weatherLocation}
              />
            </div>
          )}

          {/* Calendar Widget */}
          {calendarEnabled && (
            <div className="h-[50%]">
              <CalendarWidget
                highlightToday={widgets.calendar?.highlightToday}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .hero-carousel {
          height: 600px;
        }

        .hero-carousel .swiper-slide {
          height: 600px;
        }

        .hero-carousel .swiper-pagination-bullet {
          background: white;
          opacity: 0.5;
        }

        .hero-carousel .swiper-pagination-bullet-active {
          opacity: 1;
          background: white;
        }

        .hero-carousel .swiper-button-next,
        .hero-carousel .swiper-button-prev {
          color: white;
        }

        .hero-carousel-container .hero-carousel-nav-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.35);
          color: white;
          transition: background 0.2s ease;
        }

        .hero-carousel-container .hero-carousel-nav-button:hover {
          background: rgba(0, 0, 0, 0.55);
        }

        .hero-carousel-container .hero-carousel-prev {
          left: 16px;
        }

        .hero-carousel-container .hero-carousel-next {
          right: 16px;
        }

        .hero-carousel-container .hero-carousel-nav-button::after {
          font-size: 18px;
        }

        @media (max-width: 768px) {
          .hero-carousel {
            height: 400px;
          }

          .hero-carousel .swiper-slide {
            height: 400px;
          }

          .hero-carousel-container .hero-carousel-nav-button {
            width: 36px;
            height: 36px;
          }

          .hero-carousel-container .hero-carousel-prev {
            left: 10px;
          }

          .hero-carousel-container .hero-carousel-next {
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
}
