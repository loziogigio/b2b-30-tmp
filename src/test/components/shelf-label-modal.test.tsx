import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  modalData: {} as any,
  closeModal: vi.fn(),
  renderCanvas: vi.fn(),
  downloadJpeg: vi.fn(),
  downloadPdf: vi.fn(),
}));

vi.mock('src/app/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

vi.mock('@components/common/modal/modal.context', () => ({
  useModalState: () => ({ data: mocks.modalData }),
  useModalAction: () => ({ closeModal: mocks.closeModal }),
}));

vi.mock('@framework/product/shelf-label', () => ({
  LABEL_WIDTH_MM: 50,
  LABEL_HEIGHT_MM: 30,
  renderShelfLabelCanvas: (...args: any[]) => mocks.renderCanvas(...args),
  downloadShelfLabelJpeg: (...args: any[]) => mocks.downloadJpeg(...args),
  downloadShelfLabelPdf: (...args: any[]) => mocks.downloadPdf(...args),
}));

import ShelfLabelModal from '@components/product/shelf-label-modal';

const PRODUCT = {
  name: 'CALDAIA MURALE 24KW',
  sku: '525131',
  ean: '8054602013748',
};

const fakeCanvas = { toDataURL: () => 'data:image/png;base64,AAAA' };

beforeEach(() => {
  mocks.modalData = { ...PRODUCT };
  mocks.closeModal.mockReset();
  mocks.renderCanvas.mockReset().mockReturnValue(fakeCanvas);
  mocks.downloadJpeg.mockReset().mockReturnValue(true);
  mocks.downloadPdf.mockReset().mockReturnValue(true);
});

describe('ShelfLabelModal', () => {
  it('previews the label using the same canvas the downloads render from', () => {
    render(<ShelfLabelModal lang="it" />);

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,AAAA');
    expect(mocks.renderCanvas).toHaveBeenCalledWith(PRODUCT);
  });

  it('offers both formats and says which one is true size', () => {
    render(<ShelfLabelModal lang="it" />);

    expect(screen.getByText('Scarica JPEG')).toBeTruthy();
    expect(screen.getByText('Scarica PDF')).toBeTruthy();
    // The JPEG carries no DPI metadata, so the note must not be dropped.
    expect(screen.getByText(/dimensione reale/i)).toBeTruthy();
  });

  it('downloads a JPEG with exactly the product it was opened for', () => {
    render(<ShelfLabelModal lang="it" />);

    fireEvent.click(screen.getByText('Scarica JPEG'));

    expect(mocks.downloadJpeg).toHaveBeenCalledWith(PRODUCT);
    expect(mocks.downloadPdf).not.toHaveBeenCalled();
  });

  it('downloads a PDF from the other button', () => {
    render(<ShelfLabelModal lang="it" />);

    fireEvent.click(screen.getByText('Scarica PDF'));

    expect(mocks.downloadPdf).toHaveBeenCalledWith(PRODUCT);
    expect(mocks.downloadJpeg).not.toHaveBeenCalled();
  });

  it('surfaces a failed download instead of failing silently', () => {
    mocks.downloadPdf.mockReturnValue(false);
    render(<ShelfLabelModal lang="it" />);

    expect(screen.queryByText(/Impossibile generare/i)).toBeNull();
    fireEvent.click(screen.getByText('Scarica PDF'));
    expect(screen.getByText(/Impossibile generare/i)).toBeTruthy();
  });

  it('shows the failure message and no buttons when the label cannot be rendered', () => {
    mocks.renderCanvas.mockReturnValue(null);
    render(<ShelfLabelModal lang="it" />);

    expect(screen.getByText(/Impossibile generare/i)).toBeTruthy();
    expect(screen.queryByText('Scarica JPEG')).toBeNull();
    expect(screen.queryByText('Scarica PDF')).toBeNull();
  });

  it('closes from the header', () => {
    render(<ShelfLabelModal lang="it" />);

    fireEvent.click(screen.getByText('Chiudi'));

    expect(mocks.closeModal).toHaveBeenCalledTimes(1);
  });
});
