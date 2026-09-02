import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  closeModal: vi.fn(),
  goBack: vi.fn(),
  stack: [{}] as any[],
  data: {} as any,
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalState: () => ({ stack: mocks.stack, data: mocks.data }),
  useModalAction: () => ({
    closeModal: mocks.closeModal,
    goBack: mocks.goBack,
  }),
}));

import TimePackagingModal from '@/components/themes/time/product/time-packaging-modal';

const options = [
  { packaging_code: 'E120', packaging_uom: 'Nr', qty_x_packaging: 180 },
  {
    packaging_code: 'CRT',
    packaging_uom: 'Nr',
    qty_x_packaging: 6,
    packaging_is_default: true,
  },
  { packaging_code: 'E240', packaging_uom: 'Nr', qty_x_packaging: 360 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stack = [{}];
  mocks.data = {
    sku: 'BF05003',
    name: "SCOLAPOSATE GAIA PIU' - BIANCO",
    options,
  };
});

describe('TimePackagingModal', () => {
  it('names the article it was opened for', () => {
    render(<TimePackagingModal lang="it" />);
    expect(screen.getByText('BF05003')).toBeTruthy();
    expect(screen.getByText("SCOLAPOSATE GAIA PIU' - BIANCO")).toBeTruthy();
  });

  it('lists every packaging option with its unit and quantity', () => {
    render(<TimePackagingModal lang="it" />);
    for (const code of ['CRT', 'E120', 'E240']) {
      expect(screen.getByText(code)).toBeTruthy();
    }
    expect(screen.getByText('180')).toBeTruthy();
    expect(screen.getByText('360')).toBeTruthy();
  });

  it('puts the default packaging first and marks it', () => {
    render(<TimePackagingModal lang="it" />);
    const codes = screen
      .getAllByText(/^(CRT|E120|E240)$/)
      .map((el) => el.textContent);
    expect(codes[0]).toBe('CRT');
    expect(screen.getByText(/Imballo di default/i)).toBeTruthy();
  });

  it('closes from the close control', () => {
    render(<TimePackagingModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
  });

  it('renders without an article identity', () => {
    mocks.data = { options };
    render(<TimePackagingModal lang="it" />);
    expect(screen.getByText('CRT')).toBeTruthy();
  });

  it('renders with no packaging options at all', () => {
    mocks.data = { sku: 'X', name: 'Y', options: [] };
    render(<TimePackagingModal lang="it" />);
    expect(screen.getByText('X')).toBeTruthy();
  });
});
