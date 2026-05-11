import { describe, it, expect } from 'vitest';
import {
  isCustomerContextUrl,
  evaluateErpResponse,
} from '@framework/erp/erp-health-interceptor';

describe('isCustomerContextUrl', () => {
  it('matches /erp/ paths', () => {
    expect(isCustomerContextUrl('/erp/get_multiple_prices')).toBe(true);
    expect(
      isCustomerContextUrl(
        'https://b2b.example.com/api/v1/erp/get_multiple_prices',
      ),
    ).toBe(true);
  });

  it('matches /b2b/cart paths', () => {
    expect(isCustomerContextUrl('/api/b2b/cart/active')).toBe(true);
    expect(isCustomerContextUrl('/api/b2b/cart/order/123')).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(isCustomerContextUrl('/api/search/search')).toBe(false);
    expect(isCustomerContextUrl('/api/public/menu')).toBe(false);
    expect(isCustomerContextUrl(undefined)).toBe(false);
  });
});

describe('evaluateErpResponse', () => {
  it('500 on /erp/ while authorized → failure', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('failure');
  });

  it('400 on /b2b/cart while authorized → failure', () => {
    expect(
      evaluateErpResponse({
        status: 400,
        url: '/api/b2b/cart/active',
        authorized: true,
        isError: true,
      }),
    ).toBe('failure');
  });

  it('401 on /erp/ → ignore (handled by auth interceptor)', () => {
    expect(
      evaluateErpResponse({
        status: 401,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('500 on /erp/ while NOT authorized → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/erp/get_multiple_prices',
        authorized: false,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('network error (no status) on /erp/ → ignore', () => {
    expect(
      evaluateErpResponse({
        status: undefined,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('500 on unrelated url → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 500,
        url: '/api/search/search',
        authorized: true,
        isError: true,
      }),
    ).toBe('ignore');
  });

  it('200 on /b2b/cart → success', () => {
    expect(
      evaluateErpResponse({
        status: 200,
        url: '/api/b2b/cart/active',
        authorized: true,
        isError: false,
      }),
    ).toBe('success');
  });

  it('200 on unrelated url → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 200,
        url: '/api/public/menu',
        authorized: true,
        isError: false,
      }),
    ).toBe('ignore');
  });

  it('3xx success-side response on /erp/ → ignore', () => {
    expect(
      evaluateErpResponse({
        status: 304,
        url: '/erp/get_multiple_prices',
        authorized: true,
        isError: false,
      }),
    ).toBe('ignore');
  });
});
