import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  openModal: vi.fn(),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalAction: () => ({ openModal: mocks.openModal }),
}));

import TimeBarcodeButton from '@/components/themes/time/product/time-barcode-button';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeBarcodeButton', () => {
  it('offers the barcode for a product that has an EAN', () => {
    render(<TimeBarcodeButton lang="it" sku="BF05003" ean="8012345678905" />);
    expect(
      screen.getByRole('button', { name: /codice a barre/i }),
    ).toBeTruthy();
  });

  it('renders nothing when the product has no EAN', () => {
    const { container } = render(
      <TimeBarcodeButton lang="it" sku="BF05003" ean="" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when the EAN is only whitespace', () => {
    const { container } = render(
      <TimeBarcodeButton lang="it" sku="Y" ean="   " />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('opens the barcode viewer with the article it was given', () => {
    render(<TimeBarcodeButton lang="it" sku="BF05003" ean="8012345678905" />);
    fireEvent.click(screen.getByRole('button', { name: /codice a barre/i }));
    expect(mocks.openModal).toHaveBeenCalledWith('BARCODE_VIEW', {
      sku: 'BF05003',
      ean: '8012345678905',
    });
  });

  it('sizes itself for the compact popup action row', () => {
    render(
      <TimeBarcodeButton
        lang="it"
        sku="Y"
        ean="8012345678905"
        size="compact"
      />,
    );
    const button = screen.getByRole('button', { name: /codice a barre/i });
    expect(button.className).toContain('h-[36px]');
  });

  it('sizes itself for the detail-page action row by default', () => {
    render(<TimeBarcodeButton lang="it" sku="Y" ean="8012345678905" />);
    const button = screen.getByRole('button', { name: /codice a barre/i });
    expect(button.className).toContain('h-[38px]');
  });
});
