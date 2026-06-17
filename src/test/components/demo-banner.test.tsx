import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

let mockTenantValue: any;
vi.mock('@contexts/tenant.context', () => ({
  useTenantOptional: () => mockTenantValue,
}));

import DemoBanner from '@components/demo/demo-banner';
import { DemoUiEnvProvider } from '@/lib/demo/use-demo-ui';

function renderBanner(envEnabled = true) {
  return render(
    <DemoUiEnvProvider value={envEnabled}>
      <DemoBanner />
    </DemoUiEnvProvider>,
  );
}

describe('DemoBanner gating (no leak)', () => {
  beforeEach(() => {
    mockTenantValue = { tenant: { features: { isDemo: true } } };
    window.localStorage.clear();
  });

  it('renders the strip when isDemo && env true', () => {
    renderBanner(true);
    expect(screen.getByText(/Demo VINC/i)).toBeInTheDocument();
    expect(screen.getByText(/Velia Ferramenta/i)).toBeInTheDocument();
  });

  it('renders NOTHING for a real tenant (features undefined)', () => {
    mockTenantValue = { tenant: { features: undefined } };
    const { container } = renderBanner(true);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders NOTHING when isDemo is false', () => {
    mockTenantValue = { tenant: { features: { isDemo: false } } };
    const { container } = renderBanner(true);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders NOTHING when the env context is false (kill-switch off)', () => {
    const { container } = renderBanner(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismiss hides the banner and persists in localStorage', async () => {
    const user = userEvent.setup();
    const { container } = renderBanner(true);
    await user.click(screen.getByRole('button', { name: /chiudi|dismiss|close/i }));
    expect(container).toBeEmptyDOMElement();
    expect(window.localStorage.getItem('vinc-demo-banner-dismissed')).toContain(
      'true',
    );
  });
});

describe('DemoBanner is theme-agnostic', () => {
  // The banner reads NO theme — it must render identically regardless of the
  // active theme. We assert it renders under both by toggling b2bTheme on the
  // mocked tenant (the component must not branch on it).
  it.each(['default', 'time'])('renders under the %s theme', (theme) => {
    window.localStorage.clear();
    mockTenantValue = { tenant: { b2bTheme: theme, features: { isDemo: true } } };
    render(
      <DemoUiEnvProvider value={true}>
        <DemoBanner />
      </DemoUiEnvProvider>,
    );
    expect(screen.getByText(/Demo VINC/i)).toBeInTheDocument();
  });
});
