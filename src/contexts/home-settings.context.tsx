'use client';

import React from 'react';
import type { HomeSettings } from '@/lib/home-settings/types';
import { DEFAULT_HOME_SETTINGS } from '@/lib/home-settings/defaults';

interface HomeSettingsContextValue {
  settings: HomeSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const HomeSettingsContext = React.createContext<
  HomeSettingsContextValue | undefined
>(undefined);
HomeSettingsContext.displayName = 'HomeSettingsContext';

interface HomeSettingsProviderProps {
  initialSettings: HomeSettings | null;
  children: React.ReactNode;
}

export function HomeSettingsProvider({
  initialSettings,
  children,
}: HomeSettingsProviderProps) {
  const [settings, setSettings] = React.useState<HomeSettings | null>(
    initialSettings ?? DEFAULT_HOME_SETTINGS,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialSettings);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/b2b/home-settings', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch home settings: ${response.statusText}`,
        );
      }
      const data = (await response.json()) as HomeSettings;
      setSettings({
        ...DEFAULT_HOME_SETTINGS,
        ...data,
        branding: {
          ...DEFAULT_HOME_SETTINGS.branding,
          ...(data.branding ?? {}),
        },
        cardStyle: {
          ...DEFAULT_HOME_SETTINGS.cardStyle,
          ...(data.cardStyle ?? {}),
        },
      });
      setError(null);
    } catch (refreshError) {
      console.error('[HomeSettings] refresh failed:', refreshError);
      setError(
        refreshError instanceof Error ? refreshError.message : 'Unknown error',
      );
      setSettings(DEFAULT_HOME_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!initialSettings) {
      refresh().catch(() => {});
    }
  }, [initialSettings, refresh]);

  const value = React.useMemo<HomeSettingsContextValue>(
    () => ({ settings, isLoading, error, refresh }),
    [settings, isLoading, error, refresh],
  );

  return (
    <HomeSettingsContext.Provider value={value}>
      {children}
    </HomeSettingsContext.Provider>
  );
}

export function useHomeSettingsContext() {
  const ctx = React.useContext(HomeSettingsContext);
  return ctx;
}
