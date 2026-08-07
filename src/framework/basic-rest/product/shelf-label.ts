import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { isValidEan13 } from '@utils/ean';

/**
 * Printable shelf label for a product: name, article code and the EAN barcode.
 *
 * Deliberately carries NO price. In a wholesale tenant the label is printed by a
 * reseller for their own shelf edge — printing the logged-in customer's
 * negotiated net price there would expose their buying cost to their end
 * customer, and printing a list price would need a VAT decision this feature
 * does not own.
 *
 * PDF and JPEG are rendered from the SAME canvas, so the two downloads cannot
 * drift apart in layout.
 *
 * Browser-only: it needs a real <canvas>. Callers are client components.
 */

/** Physical label size in millimetres. Change these to match the label stock. */
export const LABEL_WIDTH_MM = 50;
export const LABEL_HEIGHT_MM = 30;

/** Render at print resolution, not screen resolution, or the barcode won't scan. */
const DPI = 300;
const MM_PER_INCH = 25.4;
const PX_PER_MM = DPI / MM_PER_INCH;

const mm = (value: number): number => Math.round(value * PX_PER_MM);

export interface ShelfLabelInput {
  name: string;
  sku: string;
  ean: string;
}

/**
 * Wrap text to at most `maxLines`, ellipsising the last line if it overflows.
 * Canvas has no text wrapping of its own.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  // Ellipsise the last line if we ran out of lines mid-name.
  const consumed = lines.join(' ');
  if (consumed.length < text.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

/**
 * Render the barcode on its own canvas.
 *
 * A retail shelf scanner expects EAN-13, so that is the format whenever the
 * value really is one. JsBarcode THROWS on invalid EAN13 input (wrong length or
 * bad check digit), which would blank the whole label — so a non-conforming
 * code degrades to CODE128, which still scans and still prints the number.
 */
function renderBarcodeCanvas(ean: string): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, ean, {
      format: isValidEan13(ean) ? 'EAN13' : 'CODE128',
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

/** Compose the full label. Returns null when there is nothing printable. */
export function renderShelfLabelCanvas({
  name,
  sku,
  ean,
}: ShelfLabelInput): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !ean) return null;

  const width = mm(LABEL_WIDTH_MM);
  const height = mm(LABEL_HEIGHT_MM);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // JPEG has no alpha channel: an unpainted canvas exports as solid black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const pad = mm(2);
  const textWidth = width - pad * 2;
  let y = pad;

  ctx.textBaseline = 'top';

  const trimmedName = (name || '').trim();
  if (trimmedName) {
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${mm(3.2)}px Arial, Helvetica, sans-serif`;
    for (const line of wrapText(ctx, trimmedName, textWidth, 2)) {
      ctx.fillText(line, pad, y);
      y += mm(3.8);
    }
  }

  const trimmedSku = (sku || '').trim();
  if (trimmedSku) {
    ctx.fillStyle = '#444444';
    ctx.font = `${mm(2.6)}px Arial, Helvetica, sans-serif`;
    ctx.fillText(`COD. ${trimmedSku}`, pad, y);
    y += mm(3.2);
  }

  const barcode = renderBarcodeCanvas(ean);
  if (!barcode) return null;

  // Bottom-anchored and centred, scaled to whatever room the text left behind.
  const availableHeight = height - y - pad;
  const scale = Math.min(
    textWidth / barcode.width,
    availableHeight / barcode.height,
  );
  const drawWidth = Math.floor(barcode.width * scale);
  const drawHeight = Math.floor(barcode.height * scale);
  ctx.drawImage(
    barcode,
    Math.floor((width - drawWidth) / 2),
    Math.floor(height - pad - drawHeight),
    drawWidth,
    drawHeight,
  );

  return canvas;
}

/** `etichetta-<sku>.<ext>`, with anything filesystem-hostile stripped out. */
export function shelfLabelFilename(
  sku: string,
  ean: string,
  extension: string,
): string {
  const base = (sku || ean || 'etichetta').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `etichetta-${base}.${extension}`;
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Returns false when the label could not be produced, so callers can warn. */
export function downloadShelfLabelJpeg(input: ShelfLabelInput): boolean {
  const canvas = renderShelfLabelCanvas(input);
  if (!canvas) return false;

  triggerDownload(
    canvas.toDataURL('image/jpeg', 0.95),
    shelfLabelFilename(input.sku, input.ean, 'jpg'),
  );
  return true;
}

/** Returns false when the label could not be produced, so callers can warn. */
export function downloadShelfLabelPdf(input: ShelfLabelInput): boolean {
  const canvas = renderShelfLabelCanvas(input);
  if (!canvas) return false;

  // The page IS the label, so it prints at true physical size rather than as a
  // stamp in the corner of an A4. Orientation stays 'portrait' even though the
  // label is landscape-shaped: jsPDF swaps the format array when told
  // 'landscape', which would silently give a 30×50 page instead of 50×30.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM],
  });
  doc.addImage(
    canvas.toDataURL('image/png'),
    'PNG',
    0,
    0,
    LABEL_WIDTH_MM,
    LABEL_HEIGHT_MM,
  );
  doc.save(shelfLabelFilename(input.sku, input.ean, 'pdf'));
  return true;
}
