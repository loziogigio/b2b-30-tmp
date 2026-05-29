import { describe, it, expect } from 'vitest';
import { parseMyMbConnection } from '../mymb/auth.js';

describe('parseMyMbConnection', () => {
  it('splits embedded credentials into base URL + Basic auth header', () => {
    const c = parseMyMbConnection('http://USER1:PASS1@10.0.0.5:8896/MyMB/Service/web');
    expect(c.baseUrl).toBe('http://10.0.0.5:8896/MyMB/Service/web');
    expect(c.authHeader).toBe(`Basic ${Buffer.from('USER1:PASS1').toString('base64')}`);
  });

  it('strips a trailing slash from the base URL', () => {
    const c = parseMyMbConnection('http://u:p@h:1/MyMB/web/');
    expect(c.baseUrl).toBe('http://u:p@h:1/MyMB/web'.replace('u:p@', ''));
  });

  it('throws when credentials are missing', () => {
    expect(() => parseMyMbConnection('http://h:1/MyMB/web')).toThrow(/credentials/i);
  });

  it('throws on an unparseable URL', () => {
    expect(() => parseMyMbConnection('not a url')).toThrow();
  });
});
