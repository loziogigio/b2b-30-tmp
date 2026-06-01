import { describe, it, expect } from 'vitest';
import { sourcePolicy } from '@/framework/basic-rest/profile/source-policy';

describe('sourcePolicy', () => {
  it('default theme → VINC account + inline pricing', () => {
    expect(sourcePolicy('default')).toEqual({ account: 'vinc', pricing: 'inline' });
  });

  it('time theme → erp account + erp pricing', () => {
    expect(sourcePolicy('time')).toEqual({ account: 'erp', pricing: 'erp' });
  });

  it('unknown/undefined theme does NOT route account to VINC', () => {
    expect(sourcePolicy('something-else').account).toBe('erp');
    expect(sourcePolicy(undefined).account).toBe('erp');
  });
});
