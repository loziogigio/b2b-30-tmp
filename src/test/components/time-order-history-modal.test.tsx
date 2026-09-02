import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  modalData: {} as any,
  history: { isLoading: false, isError: false, data: undefined as any },
  closeModal: vi.fn(),
  goBack: vi.fn(),
  stack: [{}] as any[],
  erpStatic: { customer_code: '5300' },
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k,
  }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalState: () => ({ data: mocks.modalData, stack: mocks.stack }),
  useModalAction: () => ({
    closeModal: mocks.closeModal,
    goBack: mocks.goBack,
  }),
}));
vi.mock('@framework/erp/latest-order', () => ({
  useLatestOrderByItem: () => mocks.history,
}));
vi.mock('@framework/utils/static', () => ({
  get ERP_STATIC() {
    return mocks.erpStatic;
  },
}));
vi.mock('@components/ui/image', () => ({
  default: (props: any) => <img alt={props.alt} />,
}));

import TimeOrderHistoryModal from '@/components/themes/time/product/time-order-history-modal';

// Shaped like the live capture: customer 5300 x article 53295 (SKU BF05003).
function row(over: Partial<Record<string, any>> = {}) {
  return {
    date: '31/07/2026',
    causale: 'OC',
    document: '2026/1110',
    lineNumber: 160,
    ordered: 48,
    settled: 0,
    delivered: 48,
    residual: 0,
    unitPrice: 1.52,
    ...over,
  };
}

const product = {
  sku: 'BF05003',
  name: "SCOLAPOSATE GAIA PIU' - BIANCO",
  image: { thumbnail: '/img.jpg' },
};

function setHistory(fromDate: string, rows: any[]) {
  mocks.history = {
    isLoading: false,
    isError: false,
    data: { fromDate, rows },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stack = [{}];
  mocks.erpStatic = { customer_code: '5300' };
  mocks.modalData = {
    product,
    priceData: { entity_code: '53295' },
  };
  setHistory('01/01/2024', [row()]);
});

describe('TimeOrderHistoryModal', () => {
  it('renders the article identity in the header', () => {
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.getByText('BF05003')).toBeTruthy();
    expect(screen.getByText("SCOLAPOSATE GAIA PIU' - BIANCO")).toBeTruthy();
  });

  it('shows the ERP history cutoff date', () => {
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.getByText(/01\/01\/2024/)).toBeTruthy();
  });

  it('renders every column of a history row', () => {
    render(<TimeOrderHistoryModal lang="it" />);
    const cells = screen.getAllByRole('cell').map((c) => c.textContent?.trim());
    expect(cells).toEqual(
      expect.arrayContaining(['31/07/2026', 'OC', '2026/1110']),
    );
  });

  it('shows quantities exactly as the ERP reported them', () => {
    // Live row: 2148 ordered but 240 delivered and 0 residual. The table must
    // not "fix" the arithmetic.
    setHistory('01/01/2024', [
      row({ ordered: 2148, settled: 0, delivered: 240, residual: 0 }),
    ]);
    render(<TimeOrderHistoryModal lang="it" />);
    const cells = screen.getAllByRole('cell').map((c) => c.textContent?.trim());
    expect(cells).toEqual(expect.arrayContaining(['2148', '240']));
  });

  it('renders at most 10 rows before the show-more button', () => {
    setHistory(
      '01/01/2024',
      Array.from({ length: 14 }, (_, i) => row({ document: `2026/${i}` })),
    );
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.getAllByRole('row')).toHaveLength(11); // 10 + header
    expect(screen.getByRole('button', { name: /Mostra altri/i })).toBeTruthy();
  });

  it('reveals the remaining rows when show-more is clicked', () => {
    setHistory(
      '01/01/2024',
      Array.from({ length: 14 }, (_, i) => row({ document: `2026/${i}` })),
    );
    render(<TimeOrderHistoryModal lang="it" />);

    fireEvent.click(screen.getByRole('button', { name: /Mostra altri/i }));

    expect(screen.getAllByRole('row')).toHaveLength(15); // 14 + header
    expect(screen.queryByRole('button', { name: /Mostra altri/i })).toBeNull();
  });

  it('hides show-more when everything already fits', () => {
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.queryByRole('button', { name: /Mostra altri/i })).toBeNull();
  });

  it('shows an empty state instead of an error when there is no history', () => {
    // MyMB cannot distinguish "never ordered" from a bad code, so an empty
    // list must never be presented as a failure.
    setHistory('', []);
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/Nessun ordine/i)).toBeTruthy();
  });

  it('shows a loading state while the ERP call is in flight', () => {
    mocks.history = { isLoading: true, isError: false, data: undefined };
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('reports a genuine transport failure', () => {
    mocks.history = { isLoading: false, isError: true, data: undefined };
    render(<TimeOrderHistoryModal lang="it" />);
    expect(screen.getByText(/non disponibile/i)).toBeTruthy();
  });

  it('closes the drawer when it is the only layer on the stack', () => {
    render(<TimeOrderHistoryModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
  });

  it('goes back instead of closing when opened from another drawer', () => {
    // Opened from the variants table, the drawer must return to the variants
    // list rather than dismissing the whole stack.
    mocks.stack = [{}, {}];
    render(<TimeOrderHistoryModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    expect(mocks.goBack).toHaveBeenCalled();
    expect(mocks.closeModal).not.toHaveBeenCalled();
  });

  it("renders inside the theme's shared drawer shell", () => {
    render(<TimeOrderHistoryModal lang="it" />);
    // The shell supplies the panel title in the accent bar.
    expect(screen.getByText(/Storico ordinato/i)).toBeTruthy();
  });

  it('caps the content column instead of stretching across the drawer', () => {
    const { container } = render(<TimeOrderHistoryModal lang="it" />);
    const content = container.querySelector(
      '[data-drawer-content]',
    ) as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.style.maxWidth).toBe('860px');
  });
});
