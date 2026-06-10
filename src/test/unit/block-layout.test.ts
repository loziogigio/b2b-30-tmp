import { describe, it, expect } from 'vitest';
import { isBlockFullWidth } from '@/lib/blocks/block-layout';

describe('isBlockFullWidth', () => {
  it('returns true when layout is full-width', () => {
    expect(isBlockFullWidth({ layout: 'full-width' })).toBe(true);
  });

  it('returns false when layout is container', () => {
    expect(isBlockFullWidth({ layout: 'container' })).toBe(false);
  });

  it('layout wins over legacy config.fullWidth', () => {
    expect(
      isBlockFullWidth({ layout: 'container', config: { fullWidth: true } }),
    ).toBe(false);
    expect(
      isBlockFullWidth({ layout: 'full-width', config: { fullWidth: false } }),
    ).toBe(true);
  });

  it('falls back to legacy config.fullWidth when layout is unset', () => {
    expect(isBlockFullWidth({ config: { fullWidth: true } })).toBe(true);
    expect(isBlockFullWidth({ config: { fullWidth: false } })).toBe(false);
  });

  it('defaults to contained (false) when nothing is set', () => {
    expect(isBlockFullWidth({})).toBe(false);
    expect(isBlockFullWidth(null)).toBe(false);
    expect(isBlockFullWidth(undefined)).toBe(false);
  });
});
