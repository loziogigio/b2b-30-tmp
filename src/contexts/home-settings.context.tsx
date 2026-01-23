'use client';

import React from 'react';
import type { HomeSettings } from '@/lib/home-settings/types';

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
    initialSettings,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialSettings);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Internal API route - credentials are handled server-side
      const response = await fetch('/api/b2b/home-settings', {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        setSettings(null);
        return;
      }
      const data = (await response.json()) as HomeSettings;
      setSettings(data);
      setError(null);
    } catch {
      setSettings(null);
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
