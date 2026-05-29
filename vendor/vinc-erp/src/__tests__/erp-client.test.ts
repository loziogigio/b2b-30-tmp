import { describe, it, expect } from 'vitest';
import { ErpError } from '../erp-client.js';

describe('ErpError', () => {
  it('carries endpoint, status, returnCode and message', () => {
    const e = new ErpError('boom', { endpoint: 'GetX', status: 502, returnCode: 3 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ErpError');
    expect(e.message).toBe('boom');
    expect(e.endpoint).toBe('GetX');
    expect(e.status).toBe(502);
    expect(e.returnCode).toBe(3);
  });
});
