import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const useThemeIdMock = vi.fn();
vi.mock('@/contexts/tenant.context', () => ({
  useThemeId: () => useThemeIdMock(),
}));
const catalogSettingsMock = vi.fn();
vi.mock('@/hooks/use-catalog-settings', () => ({
  useCatalogSettings: () => catalogSettingsMock(),
}));
vi.mock('@/lib/theme/registry', () => ({
  getThemedComponent: (slot: string) =>
    slot === 'VariantsTable'
      ? () => <div data-testid="variants-table" />
      : () => <div data-testid="variant-card" />,
}));
vi.mock('@framework/pricing', () => ({
  useProductsPriceMap: () => ({}),
}));
vi.mock('@contexts/ui.context', () => ({
  useUI: () => ({ isAuthorized: false }),
}));
vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@assets/placeholders', () => ({ productPlaceholder: 'ph.jpg' }));
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import B2BVariantsGridContent from '@components/product/b2b-variants-grid-content';

const product = {
  id: 'p1',
  name: 'Parent',
  sku: 'PARENT-1',
  variations: [
    { id: 'v1', sku: 'SKU-A', model: 'M1' },
    { id: 'v2', sku: 'SKU-B', model: 'M2' },
  ],
};

const settings = (defaultView: 'grid' | 'list') => ({
  settings: {
    defaultView,
    productOpenMode: 'modal' as const,
    availabilityDisplay: 'in_out' as const,
  },
  isLoading: false,
});

describe('B2BVariantsGridContent view toggle', () => {
  beforeEach(() => {
    useThemeIdMock.mockReset();
    catalogSettingsMock.mockReset();
    catalogSettingsMock.mockReturnValue(settings('grid'));
  });

  it('shows the toggle and switches to the list table under the time theme', () => {
    useThemeIdMock.mockReturnValue('time');
    render(<B2BVariantsGridContent lang="it" product={product} />);
    expect(screen.getAllByTestId('variant-card').length).toBe(2);
    expect(screen.queryByTestId('variants-table')).toBeNull();

    fireEvent.click(screen.getByLabelText('List'));
    expect(screen.getByTestId('variants-table')).toBeInTheDocument();
    expect(screen.queryByTestId('variant-card')).toBeNull();
  });

  it('hides the toggle in the default theme (grid only)', () => {
    useThemeIdMock.mockReturnValue('default');
    render(<B2BVariantsGridContent lang="it" product={product} />);
    expect(screen.queryByLabelText('List')).toBeNull();
    expect(screen.getAllByTestId('variant-card').length).toBe(2);
  });

  it('starts in list view when the channel default_view is list (time theme)', () => {
    useThemeIdMock.mockReturnValue('time');
    catalogSettingsMock.mockReturnValue(settings('list'));
    render(<B2BVariantsGridContent lang="it" product={product} />);
    expect(screen.getByTestId('variants-table')).toBeInTheDocument();
    expect(screen.queryByTestId('variant-card')).toBeNull();
  });

  it('ignores default_view=list in the default theme (no list mode)', () => {
    useThemeIdMock.mockReturnValue('default');
    catalogSettingsMock.mockReturnValue(settings('list'));
    render(<B2BVariantsGridContent lang="it" product={product} />);
    expect(screen.queryByTestId('variants-table')).toBeNull();
    expect(screen.getAllByTestId('variant-card').length).toBe(2);
  });

  it('a manual toggle overrides the channel default_view for the session', () => {
    useThemeIdMock.mockReturnValue('time');
    catalogSettingsMock.mockReturnValue(settings('list'));
    render(<B2BVariantsGridContent lang="it" product={product} />);
    // starts on list per the default…
    expect(screen.getByTestId('variants-table')).toBeInTheDocument();
    // …user switches to grid; the choice wins.
    fireEvent.click(screen.getByLabelText('Grid'));
    expect(screen.getAllByTestId('variant-card').length).toBe(2);
    expect(screen.queryByTestId('variants-table')).toBeNull();
  });
});
