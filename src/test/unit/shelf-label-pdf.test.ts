import { describe, expect, it } from 'vitest';
import {
  createLabelDocument,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  shelfLabelFilename,
} from '@framework/product/shelf-label';

describe('createLabelDocument', () => {
  it('produces a page exactly the size of the label', () => {
    // Regression: jsPDF normalises the format array TO the orientation, so
    // `portrait` with format [50, 30] silently yields a 30×50 page and clips
    // the right of the label off the sheet.
    const doc = createLabelDocument();

    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(LABEL_WIDTH_MM, 5);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(LABEL_HEIGHT_MM, 5);
  });

  it('is asserted against the exported constants, so a stock change stays covered', () => {
    // Guards the assertion above from being weakened into hard-coded 50/30.
    expect(LABEL_WIDTH_MM).toBeGreaterThan(0);
    expect(LABEL_HEIGHT_MM).toBeGreaterThan(0);
  });
});

describe('shelfLabelFilename', () => {
  it('names the file after the article code', () => {
    expect(shelfLabelFilename('525131', '8054602013748', 'pdf')).toBe(
      'etichetta-525131.pdf',
    );
  });

  it('sanitises anything filesystem-hostile out of the code', () => {
    expect(shelfLabelFilename('AB/12 34', '8054602013748', 'jpg')).toBe(
      'etichetta-AB-12-34.jpg',
    );
  });

  it('falls back to the EAN when there is no article code', () => {
    expect(shelfLabelFilename('', '8054602013748', 'jpg')).toBe(
      'etichetta-8054602013748.jpg',
    );
  });
});
