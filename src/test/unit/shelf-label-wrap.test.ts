import { describe, expect, it } from 'vitest';
import { wrapText } from '@framework/product/shelf-label';

/** Deterministic monospace stand-in: every character is exactly 10 units wide. */
const CHAR = 10;
const ctx = {
  measureText: (text: string) => ({ width: text.length * CHAR }),
} as unknown as CanvasRenderingContext2D;

const widthOf = (line: string) => line.length * CHAR;

describe('wrapText', () => {
  it('returns nothing for an empty or blank name', () => {
    expect(wrapText(ctx, '', 200, 2)).toEqual([]);
    expect(wrapText(ctx, '   ', 200, 2)).toEqual([]);
  });

  it('keeps a short name on one line with no ellipsis', () => {
    expect(wrapText(ctx, 'VITE M6', 200, 2)).toEqual(['VITE M6']);
  });

  it('wraps onto the second line without an ellipsis when it all fits', () => {
    // 'VITE TSPEI' is 10 chars = 100 units; maxWidth 100 fits exactly one word pair.
    const lines = wrapText(ctx, 'VITE TSPEI M6X20', 100, 2);
    expect(lines).toEqual(['VITE TSPEI', 'M6X20']);
  });

  it('does NOT ellipsise a name that merely contains a double space', () => {
    // The bug this pins: counting consumed CHARACTERS instead of WORDS made any
    // name with a whitespace run look truncated, and then chopped real letters
    // off to make room for the "…".
    expect(wrapText(ctx, 'VITE  TSPEI M6X20', 400, 2)).toEqual([
      'VITE TSPEI M6X20',
    ]);
    expect(wrapText(ctx, 'VITE\tTSPEI\n\nM6X20', 400, 2)).toEqual([
      'VITE TSPEI M6X20',
    ]);
  });

  it('ellipsises only when the name really overflows maxLines', () => {
    const lines = wrapText(ctx, 'AAA BBB CCC DDD EEE FFF', 70, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    for (const line of lines) expect(widthOf(line)).toBeLessThanOrEqual(70);
  });

  it('clamps a single word wider than the label instead of overflowing it', () => {
    // No wrap opportunity at all: the word must still be cut to fit.
    const lines = wrapText(ctx, 'MOTORIDUTTOREAUTOBLOCCANTE', 90, 2);
    expect(lines).toHaveLength(1);
    expect(widthOf(lines[0])).toBeLessThanOrEqual(90);
    expect(lines[0].endsWith('…')).toBe(true);
  });

  it('keeps every line inside maxWidth when a long word is followed by more', () => {
    const lines = wrapText(ctx, 'DONAUDAMPFSCHIFFFAHRT XY', 90, 2);
    for (const line of lines) expect(widthOf(line)).toBeLessThanOrEqual(90);
  });

  it('never returns more than maxLines', () => {
    const many = Array.from({ length: 50 }, (_, i) => `W${i}`).join(' ');
    expect(wrapText(ctx, many, 100, 1)).toHaveLength(1);
    expect(wrapText(ctx, many, 100, 2)).toHaveLength(2);
  });
});
