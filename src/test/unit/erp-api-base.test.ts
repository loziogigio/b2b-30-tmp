import { describe, it, expect } from 'vitest';
import { erpApiPath } from '@/framework/basic-rest/utils/erp-api-base';

describe('erpApiPath', () => {
  it('routes the time theme to the direct ERP path', () => {
    expect(erpApiPath('time', '/erp/get_multiple_prices')).toBe(
      '/api/erp/get_multiple_prices',
    );
  });

  it('routes other themes to the legacy proxy-relative endpoint (unchanged)', () => {
    expect(erpApiPath('default', '/erp/get_multiple_prices')).toBe(
      '/erp/get_multiple_prices',
    );
    expect(erpApiPath(undefined, '/erp/get_multiple_prices')).toBe(
      '/erp/get_multiple_prices',
    );
  });
});
