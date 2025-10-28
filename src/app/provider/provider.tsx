'use client';

import React from 'react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeSettingsProvider } from '@/contexts/home-settings.context';
import { CompareProvider } from '@/contexts/compare/compare.context';
import type { HomeSettings } from '@/lib/home-settings/types';

interface ProvidersProps extends React.PropsWithChildren {
  initialHomeSettings: HomeSettings | null;
}

function Providers({ children, initialHomeSettings }: ProvidersProps) {
  const queryClientRef = React.useRef<any>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  return (
    <Provider>
      <QueryClientProvider client={queryClientRef.current}>
        <HomeSettingsProvider initialSettings={initialHomeSettings}>
          <CompareProvider>{children}</CompareProvider>
        </HomeSettingsProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </Provider>
  );
}

export default Providers;
