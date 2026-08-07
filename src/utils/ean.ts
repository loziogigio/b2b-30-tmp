/**
 * EAN handling, shared so the barcodes BFF route and the product transform
 * cannot disagree about which value is "the" EAN for a product.
 *
 * PIM/Solr stores `ean` as a multi-value field, so it arrives as an array on
 * most records and as a bare string on some older ones.
 */

/** Pick the single EAN value out of PIM's array-or-string shape. */
export function normalizeEan(ean: unknown): string {
  const v = Array.isArray(ean) ? ean[0] : ean;
  return v == null ? '' : String(v).trim();
}

/**
 * Is this a real EAN-13 — exactly 13 digits with a valid mod-10 check digit?
 *
 * Worth checking before handing the value to JsBarcode: its EAN13 encoder
 * THROWS on a wrong-length or bad-checksum input, which would blank the label
 * instead of degrading. Callers fall back to CODE128 when this returns false.
 */
export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    // EAN-13 weights the digits 1,3,1,3,… from the left.
    sum += Number(value[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === Number(value[12]);
}
