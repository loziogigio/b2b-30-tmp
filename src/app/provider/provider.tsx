'use client';

import React from 'react';
import { Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeSettingsProvider } from '@/contexts/home-settings.context';
import { CompareProvider } from '@/contexts/compare/compare.context';
import { TenantProvider } from '@/contexts/tenant.context';
import { PushNotificationsProvider } from '@/contexts/push-notifications';
import { CategoryRootProvider } from '@/contexts/category-root.context';
import type { HomeSettings } from '@/lib/home-settings/types';
import type { TenantPublicInfo } from '@/lib/tenant/types';
import {
  DEFAULT_CATEGORY_ROOT,
  type CategoryRootMap,
} from '@/lib/seo/category-root';

interface ProvidersProps extends React.PropsWithChildren {
  initialHomeSettings: HomeSettings | null;
  lang: string;
  tenant?: TenantPublicInfo;
  isMultiTenant?: boolean;
  categoryRoots?: CategoryRootMap;
}

function Providers({
  children,
  initialHomeSettings,
  lang,
  tenant,
  isMultiTenant = false,
  categoryRoots = { default: DEFAULT_CATEGORY_ROOT },
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

  return (
    <Provider>
      <QueryClientProvider client={queryClientRef.current}>
        <TenantProvider tenant={tenantInfo} isMultiTenant={isMultiTenant}>
          <CategoryRootProvider categoryRoots={categoryRoots}>
            <HomeSettingsProvider
              lang={lang}
              initialSettings={initialHomeSettings}
            >
              <CompareProvider>
                <PushNotificationsProvider>
                  {children}
                </PushNotificationsProvider>
              </CompareProvider>
            </HomeSettingsProvider>
          </CategoryRootProvider>
        </TenantProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </Provider>
  );
}

export default Providers;
