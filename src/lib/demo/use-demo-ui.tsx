'use client';

import React, { createContext, useContext } from 'react';
import { useTenantOptional } from '@contexts/tenant.context';

/**
 * Server→client bridge for the DEMO_UI_ENABLED runtime env.
 * The root server layout reads `process.env.DEMO_UI_ENABLED` and passes the
 * boolean down via this provider. Client components must NOT read process.env
 * directly for this var — it is not a NEXT_PUBLIC_ var and is not available in
 * the browser bundle.
 * Default is false so that any component tree that does not include the provider
 * (tests, Storybook, other layouts) safely gets the disabled state.
 */
export const DemoUiEnvContext = createContext<boolean>(false);

export function DemoUiEnvProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <DemoUiEnvContext.Provider value={value}>
      {children}
    </DemoUiEnvContext.Provider>
  );
}

/**
 * Single source of truth for "should the demo UI render?". Both conditions must
 * hold:
 *   1. the tenant carries features.isDemo === true (set in Mongo, mapped in
 *      service.ts fromDocument), AND
 *   2. the DEMO_UI_ENABLED runtime server env is 'true' (surfaced via
 *      DemoUiEnvProvider in the root layout).
 * Real tenants (features undefined) and any layout without the provider get
 * `false` — the demo layer never leaks.
 */
export function useDemoUi(): boolean {
  const ctx = useTenantOptional();
  const isDemo = ctx?.tenant?.features?.isDemo === true;
  const envEnabled = useContext(DemoUiEnvContext);
  return isDemo && envEnabled;
}
