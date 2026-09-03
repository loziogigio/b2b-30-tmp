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

vi.mock('@framework/product/barcode-image', () => ({
  BARCODE_WIDTH_MM: 50,
  renderBarcodeCanvas: (...args: any[]) => mocks.renderCanvas(...args),
  downloadBarcodeJpeg: (...args: any[]) => mocks.downloadJpeg(...args),
  downloadBarcodePdf: (...args: any[]) => mocks.downloadPdf(...args),
}));

import TimeBarcodeModal from '@/components/themes/time/product/time-barcode-modal';

const PRODUCT = {
  name: 'STORAGE BOX TARTARUGO - 40x30x25 - VR/AV',
  sku: 'BF0105AS14',
  ean: '8001499010503',
};

const fakeCanvas = { toDataURL: () => 'data:image/png;base64,AAAA' };

beforeEach(() => {
  mocks.modalData = { ...PRODUCT };
  mocks.closeModal.mockReset();
  mocks.renderCanvas.mockReset().mockReturnValue(fakeCanvas);
  mocks.downloadJpeg.mockReset().mockReturnValue(true);
  mocks.downloadPdf.mockReset().mockReturnValue(true);
});

describe('TimeBarcodeModal', () => {
  it('previews the barcode from the same canvas the downloads render from', () => {
    render(<TimeBarcodeModal lang="it" />);

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('data:image/png;base64,AAAA');
    expect(mocks.renderCanvas).toHaveBeenCalledWith(PRODUCT.ean);
  });

  it('shows the barcode ALONE — no product name, no article-code line', () => {
    // This is the whole point of the separate viewer: the shelf label frames
    // the code with name + COD, this one must not.
    render(<TimeBarcodeModal lang="it" />);

    expect(screen.queryByText(PRODUCT.name)).toBeNull();
    expect(screen.queryByText(/COD\./)).toBeNull();
  });

  it('downloads the barcode as JPEG', () => {
    render(<TimeBarcodeModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /scarica jpeg/i }));
    expect(mocks.downloadJpeg).toHaveBeenCalledWith({
      sku: PRODUCT.sku,
      ean: PRODUCT.ean,
    });
  });

  it('downloads the barcode as PDF', () => {
    render(<TimeBarcodeModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /scarica pdf/i }));
    expect(mocks.downloadPdf).toHaveBeenCalledWith({
      sku: PRODUCT.sku,
      ean: PRODUCT.ean,
    });
  });

  it('warns instead of blanking when the code cannot be encoded', () => {
    mocks.renderCanvas.mockReturnValue(null);
    render(<TimeBarcodeModal lang="it" />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getByText(/impossibile generare il codice a barre/i),
    ).toBeTruthy();
  });

  it('reports a download that failed after the preview rendered', () => {
    mocks.downloadPdf.mockReturnValue(false);
    render(<TimeBarcodeModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /scarica pdf/i }));

    expect(
      screen.getByText(/impossibile generare il codice a barre/i),
    ).toBeTruthy();
  });

  it('closes from the close control', () => {
    render(<TimeBarcodeModal lang="it" />);
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }));
    expect(mocks.closeModal).toHaveBeenCalled();
  });
});
