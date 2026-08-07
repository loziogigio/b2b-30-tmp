import { describe, expect, it } from 'vitest';
import { isValidEan13, normalizeEan, pickBarcodeFormat } from '@utils/ean';

describe('isValidEan13', () => {
  it('accepts real EAN-13 codes', () => {
    for (const code of ['4006381333931', '5901234123457', '9780306406157']) {
      expect(isValidEan13(code)).toBe(true);
    }
  });

  it('accepts an all-zero code', () => {
    // Pins the outer `% 10`: a naive `10 - (sum % 10)` yields 10 here, which
    // would never equal a single digit and would reject every such code.
    expect(isValidEan13('0000000000000')).toBe(true);
  });

  it('rejects a code whose check digit is wrong', () => {
    expect(isValidEan13('4006381333930')).toBe(false);
    expect(isValidEan13('5901234123456')).toBe(false);
    expect(isValidEan13('9780306406158')).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isValidEan13('')).toBe(false);
    expect(isValidEan13('590123412345')).toBe(false); // 12 — a UPC-A
    expect(isValidEan13('59012341234571')).toBe(false); // 14
  });

  it('rejects anything that is not 13 digits', () => {
    expect(isValidEan13('590123412345X')).toBe(false);
    expect(isValidEan13('59012341234 7')).toBe(false);
    expect(isValidEan13(' 5901234123457')).toBe(false); // trimming is normalizeEan's job
  });

  it('uses the 1,3 weighting and not the inverted 3,1', () => {
    // '2000000000004' is valid under 1,3 (sum 2 → check 8? no) — pick a value
    // where the two orderings disagree and assert we follow the GS1 spec.
    // 1,3 weighting: 1*1+3*3 = 10 → sum 10 → check 0. Inverted: 1*3+3*1 = 6 → check 4.
    expect(isValidEan13('1300000000000')).toBe(true);
    expect(isValidEan13('1300000000004')).toBe(false);
  });
});

describe('normalizeEan', () => {
  it('takes the first entry of PIM multi-value arrays', () => {
    expect(normalizeEan(['8001234567890', '8009999999999'])).toBe(
      '8001234567890',
    );
  });

  it('passes a bare string through, trimmed', () => {
    expect(normalizeEan('8001234567890')).toBe('8001234567890');
    expect(normalizeEan('  8001234567890  ')).toBe('8001234567890');
  });

  it('returns an empty string for every absent shape', () => {
    expect(normalizeEan(null)).toBe('');
    expect(normalizeEan(undefined)).toBe('');
    expect(normalizeEan([])).toBe('');
    expect(normalizeEan([null])).toBe('');
  });

  it('stringifies a numeric EAN', () => {
    expect(normalizeEan(8001234567890)).toBe('8001234567890');
  });
});

describe('pickBarcodeFormat', () => {
  it('uses EAN13 for a real EAN-13', () => {
    expect(pickBarcodeFormat('5901234123457')).toBe('EAN13');
  });

  it('falls back to CODE128 for anything JsBarcode would reject as EAN13', () => {
    expect(pickBarcodeFormat('5901234123456')).toBe('CODE128'); // bad check digit
    expect(pickBarcodeFormat('590123412345')).toBe('CODE128'); // 12 digits
    expect(pickBarcodeFormat('ART-0099')).toBe('CODE128'); // internal code
    expect(pickBarcodeFormat('')).toBe('CODE128');
  });
});
