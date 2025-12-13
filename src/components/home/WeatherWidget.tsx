'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDeliveryAddress } from '@contexts/address/address.context';
import { useUI } from '@contexts/ui.context';
import {
  WiDaySunny,
  WiCloudy,
  WiRain,
  WiSnow,
  WiThunderstorm,
  WiFog,
  WiDayCloudy,
  WiNightClear,
  WiNightCloudy,
} from 'react-icons/wi';

// Default location: Naples, Italy
const DEFAULT_LOCATION = {
  city: 'Napoli',
  lat: 40.8518,
  lon: 14.2681,
  country: 'IT',
};

// Safe locale resolver to prevent DateTimeFormat errors
const resolveLocale = (lang?: string): string => {
  const supported = ['it', 'en', 'de', 'fr', 'es'];
  if (!lang) return 'it';
  const normalized = lang.split('-')[0]?.toLowerCase();
  if (supported.includes(lang)) return lang;
  if (normalized && supported.includes(normalized)) return normalized;
  try {
    // Test if locale is valid
    new Intl.DateTimeFormat(lang);
    return lang;
  } catch {
    return 'it';
  }
};

// Weather code to icon mapping (WMO codes from Open-Meteo)
const getWeatherIcon = (code: number, isDay: boolean) => {
  const iconClass = 'w-12 h-12 md:w-16 md:h-16';

  if (code === 0) {
    return isDay ? (
      <WiDaySunny className={iconClass} />
    ) : (
      <WiNightClear className={iconClass} />
    );
  }
  if (code >= 1 && code <= 3) {
    return isDay ? (
      <WiDayCloudy className={iconClass} />
    ) : (
      <WiNightCloudy className={iconClass} />
    );
  }
  if (code >= 45 && code <= 48) {
    return <WiFog className={iconClass} />;
  }
  if (code >= 51 && code <= 67) {
    return <WiRain className={iconClass} />;
  }
  if (code >= 71 && code <= 77) {
    return <WiSnow className={iconClass} />;
  }
  if (code >= 80 && code <= 82) {
    return <WiRain className={iconClass} />;
  }
  if (code >= 85 && code <= 86) {
    return <WiSnow className={iconClass} />;
  }
  if (code >= 95 && code <= 99) {
    return <WiThunderstorm className={iconClass} />;
  }
  return <WiCloudy className={iconClass} />;
};

// Weather code to description
const getWeatherDescription = (code: number, lang: string): string => {
  const descriptions: Record<string, Record<number, string>> = {
    it: {
      0: 'Sereno',
      1: 'Prevalentemente sereno',
      2: 'Parzialmente nuvoloso',
      3: 'Nuvoloso',
      45: 'Nebbia',
      48: 'Nebbia con brina',
      51: 'Pioggerella leggera',
      53: 'Pioggerella moderata',
      55: 'Pioggerella intensa',
      61: 'Pioggia leggera',
      63: 'Pioggia moderata',
      65: 'Pioggia intensa',
      71: 'Neve leggera',
      73: 'Neve moderata',
      75: 'Neve intensa',
      80: 'Rovesci leggeri',
      81: 'Rovesci moderati',
      82: 'Rovesci violenti',
      95: 'Temporale',
      96: 'Temporale con grandine',
      99: 'Temporale con grandine intensa',
    },
    en: {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail',
    },
  };

  const langMap = descriptions[lang] || descriptions.en;
  return langMap[code] || langMap[0];
};

type WeatherData = {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  humidity?: number;
  windSpeed?: number;
};

type GeoLocation = {
  city: string;
  lat: number;
  lon: number;
  country: string;
};

interface WeatherWidgetProps {
  lang: string;
  className?: string;
}

export function WeatherWidget({ lang, className }: WeatherWidgetProps) {
  const { isAuthorized } = useUI();
  const { selected: deliveryAddress } = useDeliveryAddress();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine city from user's delivery address or use default
  const userCity = useMemo(() => {
    if (isAuthorized && deliveryAddress?.address?.city) {
      return deliveryAddress.address.city;
    }
    return null;
  }, [isAuthorized, deliveryAddress]);

  // Geocode the city to get coordinates
  useEffect(() => {
    const geocodeCity = async (city: string) => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}&format=json`,
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          return {
            city: result.name,
            lat: result.latitude,
            lon: result.longitude,
            country: result.country_code || 'IT',
          };
        }
        return null;
      } catch {
        return null;
      }
    };

    const updateLocation = async () => {
      if (userCity) {
        const geoResult = await geocodeCity(userCity);
        if (geoResult) {
          setLocation(geoResult);
        } else {
          // Fallback to default if geocoding fails
          setLocation(DEFAULT_LOCATION);
        }
      } else {
        setLocation(DEFAULT_LOCATION);
      }
    };

    updateLocation();
  }, [userCity, lang]);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m&timezone=auto`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch weather');
        }

        const data = await response.json();

        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day === 1,
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
          });
        }
      } catch (err) {
        setError('Unable to load weather');
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);

  // Format time
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const safeLocale = useMemo(() => resolveLocale(lang), [lang]);

  const timeString = useMemo(() => {
    if (!now) return '--:--';
    return new Intl.DateTimeFormat(safeLocale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  }, [now, safeLocale]);

  const dateString = useMemo(() => {
    if (!now) return '';
    return new Intl.DateTimeFormat(safeLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now);
  }, [now, safeLocale]);

  const isReady = now && !loading && weather;

  // Skeleton placeholder component
  const Skeleton = ({ className: skeletonClass }: { className: string }) => (
    <div className={`bg-white/20 rounded animate-pulse ${skeletonClass}`} />
  );

  return (
    <div
      className={`flex flex-1 flex-col justify-between rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 p-4 text-white shadow-sm min-h-[160px] relative overflow-hidden ${className || ''}`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white/30 via-transparent to-white/10" />

      <div className="relative z-10">
        {/* Location & Time */}
        <div className="flex items-start justify-between">
          <div>
            {/* Location */}
            {isReady ? (
              <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                {location.city}, {location.country}
              </div>
            ) : (
              <Skeleton className="h-3 w-16" />
            )}

            {/* Time */}
            {isReady ? (
              <div className="mt-1 text-3xl font-light lg:text-4xl">
                {timeString}
              </div>
            ) : (
              <Skeleton className="h-9 w-24 mt-1" />
            )}

            {/* Date */}
            {isReady ? (
              <div className="text-[11px] capitalize opacity-80 mt-1">
                {dateString}
              </div>
            ) : (
              <Skeleton className="h-3 w-28 mt-2" />
            )}
          </div>

          {/* Weather Icon */}
          <div className="flex flex-col items-center">
            {isReady && weather ? (
              getWeatherIcon(weather.weatherCode, weather.isDay)
            ) : (
              <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* Weather Info */}
      <div className="relative z-10 mt-auto pt-3">
        {isReady && weather ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl md:text-3xl font-semibold">
                {weather.temperature}°C
              </div>
              <div className="text-[10px] uppercase tracking-wide opacity-85">
                {getWeatherDescription(weather.weatherCode, lang)}
              </div>
            </div>
            {weather.humidity !== undefined && (
              <div className="text-right text-[10px] opacity-75">
                <div>Umidità: {weather.humidity}%</div>
                {weather.windSpeed !== undefined && (
                  <div>Vento: {Math.round(weather.windSpeed)} km/h</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherWidget;
