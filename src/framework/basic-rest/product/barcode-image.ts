import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { pickBarcodeFormat } from '@utils/ean';

/**
 * The barcode on its own — bars plus the human-readable number, nothing else.
 *
 * This is the whole artifact for tenants who just want to scan or reprint a
 * code, as opposed to the shelf label (see shelf-label.ts), which frames the
 * same barcode with the product name and article code on 50×30mm stock.
 *
 * `renderBarcodeCanvas` lives HERE rather than in shelf-label.ts so both
 * viewers share one JsBarcode call site and cannot drift apart on symbology or
 * bar geometry — the two would then scan differently for the same product.
 *
 * Browser-only: it needs a real <canvas>. Callers are client components.
 */

/** Printed width in millimetres. The height follows the barcode's aspect. */
export const BARCODE_WIDTH_MM = 50;

export interface BarcodeInput {
  sku: string;
  ean: string;
}

/**
 * Encode a value as a barcode on its own canvas.
 *
 * Symbology choice lives in @utils/ean: EAN-13 when the value really is one,
 * CODE128 otherwise. JsBarcode's EAN13 encoder THROWS on a wrong-length or
 * bad-checksum input, hence the catch — a null return degrades to a message
 * rather than a blank image.
 */
export function renderBarcodeCanvas(ean: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !ean) return null;

  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, ean, {
      format: pickBarcodeFormat(ean),
      displayValue: true,
      fontSize: 30,
      height: 110,
      width: 3,
      margin: 6,
      textMargin: 3,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Page height that prints the barcode at BARCODE_WIDTH_MM without distorting
 * it. Bar WIDTHS are what a scanner measures, so the aspect must be preserved
 * exactly rather than fitted into a guessed box.
 */
export function barcodeHeightMm(canvas: {
  width: number;
  height: number;
}): number {
  if (!canvas.width) return 0;
  return (BARCODE_WIDTH_MM * canvas.height) / canvas.width;
}

/**
 * A PDF whose single page IS the barcode, so it prints at a known physical
 * size rather than as a stamp in the corner of an A4.
 *
 * jsPDF normalises the format array TO the orientation — 'portrait' forces
 * height >= width and would silently transpose a wide barcode, clipping it. So
 * the orientation is derived from the actual dimensions. Exported so a test can
 * assert the resulting page really is the size asked for.
 */
export function createBarcodeDocument(heightMm: number): jsPDF {
  return new jsPDF({
    orientation: BARCODE_WIDTH_MM >= heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [BARCODE_WIDTH_MM, heightMm],
  });
}

/** `barcode-<sku>.<ext>`, with anything filesystem-hostile stripped out. */
export function barcodeFilename(
  sku: string,
  ean: string,
  extension: string,
): string {
  const base = (sku || ean || 'barcode').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `barcode-${base}.${extension}`;
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Returns false when the barcode could not be produced, so callers can warn. */
export function downloadBarcodeJpeg({ sku, ean }: BarcodeInput): boolean {
  const canvas = renderBarcodeCanvas(ean);
  if (!canvas) return false;

  // Quality 1.0, not 0.95: JPEG ringing lands exactly on the high-contrast bar
  // edges, which is where a scanner reads.
  triggerDownload(
    canvas.toDataURL('image/jpeg', 1.0),
    barcodeFilename(sku, ean, 'jpg'),
  );
  return true;
}

/** Returns false when the barcode could not be produced, so callers can warn. */
export function downloadBarcodePdf({ sku, ean }: BarcodeInput): boolean {
  const canvas = renderBarcodeCanvas(ean);
  if (!canvas) return false;

  const heightMm = barcodeHeightMm(canvas);
  if (!heightMm) return false;

  const doc = createBarcodeDocument(heightMm);
  doc.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    BARCODE_WIDTH_MM,
    heightMm,
  );
  doc.save(barcodeFilename(sku, ean, 'pdf'));
  return true;
}
