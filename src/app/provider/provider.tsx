'use client';

import React from 'react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeSettingsProvider } from '@/contexts/home-settings.context';
import { CompareProvider } from '@/contexts/compare/compare.context';
import { TenantProvider } from '@/contexts/tenant.context';
import { PushNotificationsProvider } from '@/contexts/push-notifications';
import type { HomeSettings } from '@/lib/home-settings/types';
import type { TenantPublicInfo } from '@/lib/tenant/types';

interface ProvidersProps extends React.PropsWithChildren {
  initialHomeSettings: HomeSettings | null;
  tenant?: TenantPublicInfo;
  isMultiTenant?: boolean;
}

function Providers({
  children,
  initialHomeSettings,
  tenant,
  isMultiTenant = false,
}: ProvidersProps) {
  const queryClientRef = React.useRef<any>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  // Default tenant info if not provided (single-tenant mode)
  const tenantInfo: TenantPublicInfo = tenant || {
    id: process.env.NEXT_PUBLIC_TENANT_ID || 'default',
    name: process.env.NEXT_PUBLIC_TENANT_ID || 'Default',
    projectCode: process.env.NEXT_PUBLIC_PROJECT_CODE || 'vinc-default',
    requireLogin: process.env.NEXT_PUBLIC_REQUIRE_LOGIN === 'true',
  };

  // Debug logging for tenant config
  console.log('[Providers] Received tenant prop:', tenant);
  console.log('[Providers] Final tenantInfo:', tenantInfo);
  console.log('[Providers] isMultiTenant:', isMultiTenant);

  return (
    <Provider>
      <QueryClientProvider client={queryClientRef.current}>
        <TenantProvider tenant={tenantInfo} isMultiTenant={isMultiTenant}>
          <HomeSettingsProvider initialSettings={initialHomeSettings}>
            <CompareProvider>
              <PushNotificationsProvider>{children}</PushNotificationsProvider>
            </CompareProvider>
          </HomeSettingsProvider>
        </TenantProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </Provider>
  );
}

export default Providers;
