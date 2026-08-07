import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { pickBarcodeFormat } from '@utils/ean';

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
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';
  // Counted in WORDS, not characters: the input was split on /\s+/ and rejoined
  // with single spaces, so comparing string lengths would report a phantom
  // overflow for any name containing a double space.
  let consumedWords = 0;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    // `!current` lets an over-long single word start a line anyway, so the loop
    // always advances; clampLine below is what stops it overflowing the label.
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      consumedWords++;
      continue;
    }

    lines.push(current);
    if (lines.length === maxLines) {
      current = '';
      break;
    }
    current = word;
    consumedWords++;
  }

  if (current && lines.length < maxLines) lines.push(current);

  const overflowed = consumedWords < words.length;

  return lines.map((line, index) =>
    clampLine(ctx, line, maxWidth, overflowed && index === lines.length - 1),
  );
}

/**
 * Shrink a line until it fits, marking any cut with an ellipsis.
 *
 * Handles both causes of overflow: a name too long for `maxLines` (the caller
 * passes `withEllipsis`), and a single unbreakable word wider than the label.
 */
function clampLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
  withEllipsis: boolean,
): string {
  const candidate = withEllipsis ? `${line}…` : line;
  if (ctx.measureText(candidate).width <= maxWidth) return candidate;

  let text = line;
  while (text && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
}

/** Render the barcode on its own canvas. Symbology choice lives in @utils/ean. */
function renderBarcodeCanvas(ean: string): HTMLCanvasElement | null {
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
    // 4th arg condenses rather than overflowing when the code is very long.
    ctx.fillText(`COD. ${trimmedSku}`, pad, y, textWidth);
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
  // Interpolating the bars would spread each module over a fractional number of
  // device pixels and hand the printer grey edges to threshold — the one thing
  // a barcode cannot afford. Keep the modules hard-edged.
  ctx.imageSmoothingEnabled = false;
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

  // Quality 1.0, not 0.95: JPEG ringing lands exactly on the high-contrast bar
  // edges, which is where a scanner reads.
  triggerDownload(
    canvas.toDataURL('image/jpeg', 1.0),
    shelfLabelFilename(input.sku, input.ean, 'jpg'),
  );
  return true;
}

/**
 * A PDF whose single page IS the label, so it prints at true physical size
 * rather than as a stamp in the corner of an A4.
 *
 * jsPDF normalises the format array TO the orientation — 'portrait' forces
 * height >= width and would silently swap this into a 30×50 page, clipping the
 * right of the label off the sheet. So the orientation is derived from the
 * constants rather than hard-coded, and stays correct if the stock changes
 * shape. Exported so a test can assert the resulting page really is
 * LABEL_WIDTH_MM × LABEL_HEIGHT_MM.
 */
export function createLabelDocument(): jsPDF {
  return new jsPDF({
    orientation: LABEL_WIDTH_MM >= LABEL_HEIGHT_MM ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM],
  });
}

/** Returns false when the label could not be produced, so callers can warn. */
export function downloadShelfLabelPdf(input: ShelfLabelInput): boolean {
  const canvas = renderShelfLabelCanvas(input);
  if (!canvas) return false;

  const doc = createLabelDocument();
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
