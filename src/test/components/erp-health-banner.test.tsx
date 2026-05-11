import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { reportErpFailure, reportErpSuccess } from '@framework/erp/erp-health';

// i18n: return the key, with naive {{tenant}} interpolation appended
vi.mock('@/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'tenant' in opts ? `${key}:${opts.tenant}` : key,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

// tenant context — mutable so each test can set its own tenant
let mockTenantValue: any = {
  tenant: { name: 'Acme Supplies' },
  isMultiTenant: true,
};
vi.mock('@contexts/tenant.context', () => ({
  useTenantOptional: () => mockTenantValue,
}));

import { ErpHealthBanner } from '@components/common/erp-health-banner';

describe('ErpHealthBanner', () => {
  beforeEach(() => {
    reportErpSuccess(); // healthy
    mockTenantValue = { tenant: { name: 'Acme Supplies' }, isMultiTenant: true };
  });

  it('renders nothing when healthy', () => {
    const { container } = render(<ErpHealthBanner lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and body with tenant name when unhealthy', () => {
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    expect(screen.getByText('error-erp-profile-title')).toBeInTheDocument();
    expect(
      screen.getByText('error-erp-profile-body:Acme Supplies'),
    ).toBeInTheDocument();
  });

  it('renders a mailto link when supportContact is an email', () => {
    mockTenantValue = {
      tenant: { name: 'Acme Supplies', supportContact: 'help@acme.test' },
      isMultiTenant: true,
    };
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:help@acme.test');
  });

  it('renders a tel link when supportContact is a phone number', () => {
    mockTenantValue = {
      tenant: { name: 'Acme Supplies', supportContact: '+39 02 1234567' },
      isMultiTenant: true,
    };
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'tel:+39021234567');
  });

  it('renders no link when supportContact is absent', () => {
    reportErpFailure();
    render(<ErpHealthBanner lang="en" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
