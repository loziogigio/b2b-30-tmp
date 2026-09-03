import { describe, expect, it } from 'vitest';
import {
  BARCODE_WIDTH_MM,
  barcodeFilename,
  barcodeHeightMm,
  createBarcodeDocument,
} from '@framework/product/barcode-image';

describe('barcodeHeightMm', () => {
  it('derives the page height from the rendered barcode aspect', () => {
    // A 600×200 barcode at a 50mm width must print 50 × 16.66mm, not a
    // guessed height that would squash or stretch the bars.
    expect(barcodeHeightMm({ width: 600, height: 200 })).toBeCloseTo(
      (BARCODE_WIDTH_MM * 200) / 600,
      5,
    );
  });

  it('refuses a degenerate canvas rather than dividing by zero', () => {
    expect(barcodeHeightMm({ width: 0, height: 200 })).toBe(0);
  });
});

describe('createBarcodeDocument', () => {
  it('produces a page exactly the size asked for', () => {
    // Same jsPDF trap the shelf label hit: the format array is normalised TO
    // the orientation, so a landscape barcode declared 'portrait' silently
    // comes back transposed and clips.
    const doc = createBarcodeDocument(16.67);

    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(BARCODE_WIDTH_MM, 2);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(16.67, 2);
  });

  it('stays correct when the barcode is taller than it is wide', () => {
    const doc = createBarcodeDocument(BARCODE_WIDTH_MM * 2);

    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(BARCODE_WIDTH_MM, 2);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(
      BARCODE_WIDTH_MM * 2,
      2,
    );
  });
});

describe('barcodeFilename', () => {
  it('names the file after the article code', () => {
    expect(barcodeFilename('525131', '8054602013748', 'pdf')).toBe(
      'barcode-525131.pdf',
    );
  });

  it('sanitises anything filesystem-hostile out of the code', () => {
    expect(barcodeFilename('AB/12 34', '8054602013748', 'jpg')).toBe(
      'barcode-AB-12-34.jpg',
    );
  });

  it('falls back to the EAN when there is no article code', () => {
    expect(barcodeFilename('', '8054602013748', 'jpg')).toBe(
      'barcode-8054602013748.jpg',
    );
  });
});
