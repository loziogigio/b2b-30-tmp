import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

let mockTenantValue: any;
vi.mock('@contexts/tenant.context', () => ({
  useTenantOptional: () => mockTenantValue,
}));

import { DemoUiEnvProvider, useDemoUi } from '@/lib/demo/use-demo-ui';

function withEnv(value: boolean) {
  return ({ children }: { children: React.ReactNode }) => (
    <DemoUiEnvProvider value={value}>{children}</DemoUiEnvProvider>
  );
}

describe('useDemoUi truth table (flag AND env)', () => {
  beforeEach(() => {
    mockTenantValue = { tenant: { features: { isDemo: true } } };
  });

  it('true when env=true AND features.isDemo=true', () => {
    const { result } = renderHook(() => useDemoUi(), {
      wrapper: withEnv(true),
    });
    expect(result.current).toBe(true);
  });

  it('false when features.isDemo is false', () => {
    mockTenantValue = { tenant: { features: { isDemo: false } } };
    const { result } = renderHook(() => useDemoUi(), {
      wrapper: withEnv(true),
    });
    expect(result.current).toBe(false);
  });

  it('false when features is undefined (a REAL tenant)', () => {
    mockTenantValue = { tenant: { features: undefined } };
    const { result } = renderHook(() => useDemoUi(), {
      wrapper: withEnv(true),
    });
    expect(result.current).toBe(false);
  });

  it('false when there is no tenant context at all', () => {
    mockTenantValue = undefined;
    const { result } = renderHook(() => useDemoUi(), {
      wrapper: withEnv(true),
    });
    expect(result.current).toBe(false);
  });

  it('false when the env context is false (kill-switch off), even if flagged', () => {
    const { result } = renderHook(() => useDemoUi(), {
      wrapper: withEnv(false),
    });
    expect(result.current).toBe(false);
  });

  it('false when no DemoUiEnvProvider is present (default context = false)', () => {
    // No wrapper — context defaults to false
    const { result } = renderHook(() => useDemoUi());
    expect(result.current).toBe(false);
  });
});
