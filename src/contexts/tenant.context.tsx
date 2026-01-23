'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { TenantPublicInfo } from '@/lib/tenant/types';

/**
 * Tenant Context
 *
 * Provides tenant information to client-side React components.
 * Only contains PUBLIC information - no API keys or secrets.
 *
 * Usage:
 *   const { tenant } = useTenant();
 *   console.log(tenant.name, tenant.projectCode);
 */

interface TenantContextValue {
  tenant: TenantPublicInfo;
  isMultiTenant: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);
TenantContext.displayName = 'TenantContext';

interface TenantProviderProps {
  tenant: TenantPublicInfo;
  isMultiTenant: boolean;
  children: React.ReactNode;
}

export function TenantProvider({
  tenant,
  isMultiTenant,
  children,
}: TenantProviderProps) {
  const value = useMemo<TenantContextValue>(
    () => ({ tenant, isMultiTenant }),
    [tenant, isMultiTenant],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

/**
 * Hook to access tenant information
 *
 * @throws Error if used outside TenantProvider
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * Hook to access tenant information (optional - returns undefined if no provider)
 * Use this when you want to gracefully handle missing tenant context
 */
export function useTenantOptional(): TenantContextValue | undefined {
  return useContext(TenantContext);
}

/**
 * Get tenant ID from context or fallback to environment variable
 */
export function useTenantId(): string {
  const context = useContext(TenantContext);
  return (
    context?.tenant.id ||
    (typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_TENANT_ID || 'default')
  );
}

/**
 * Get project code from context or fallback to environment variable
 */
export function useProjectCode(): string {
  const context = useContext(TenantContext);
  return (
    context?.tenant.projectCode ||
    (typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_PROJECT_CODE || 'vinc-default')
  );
}
