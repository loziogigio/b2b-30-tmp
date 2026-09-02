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
vi.mock('@/components/themes/time/product/time-variants-grid', () => ({
  default: ({ product }: any) => (
    <div data-testid="variants-grid">{product?.sku}</div>
  ),
}));

import TimeVariantsQuickView from '@/components/themes/time/product/time-variants-quick-view';

const product = { id: 'p1', sku: 'PARENT-1', name: 'Parent' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stack = [{}];
  mocks.data = { product };
});

// Behaviour the drawer had before the shared shell was extracted; it must
// survive that refactor unchanged.
describe('TimeVariantsQuickView', () => {
  it('renders the variants grid for the product it was opened with', () => {
    render(<TimeVariantsQuickView lang="it" />);
    expect(screen.getByTestId('variants-grid').textContent).toBe('PARENT-1');
  });

  it('accepts the product passed as the bare modal payload', () => {
    mocks.data = product;
    render(<TimeVariantsQuickView lang="it" />);
    expect(screen.getByTestId('variants-grid').textContent).toBe('PARENT-1');
  });

  it('names the panel in the accent bar', () => {
    render(<TimeVariantsQuickView lang="it" />);
    expect(screen.getByText(/Anteprima varianti prodotto/i)).toBeTruthy();
  });

  // Deliberate change, not characterization: the close button used to carry a
  // hardcoded English aria-label ("Close") while its visible label was
  // translated, so screen readers announced it in the wrong language. The
  // shared shell labels it from the same translation key as the text.
  it('closes from the close button, which is labelled in the active language', () => {
    render(<TimeVariantsQuickView lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
  });

  it('closes from the back control when it is the only layer', () => {
    render(<TimeVariantsQuickView lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
    expect(mocks.goBack).not.toHaveBeenCalled();
  });

  it('pops back to the previous layer when stacked', () => {
    mocks.stack = [{}, {}];
    render(<TimeVariantsQuickView lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /indietro/i }));
    expect(mocks.goBack).toHaveBeenCalled();
    expect(mocks.closeModal).not.toHaveBeenCalled();
  });
});
