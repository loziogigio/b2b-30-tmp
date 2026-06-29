import { describe, it, expect, vi } from 'vitest';
import { CouponClient } from '../mymb/coupon-client.js';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
}
function makeClient(fetchImpl: typeof fetch) {
  return new CouponClient({ baseUrl: 'http://coupon:8884/MyMB/web', authHeader: 'Basic abc', fetchImpl });
}

describe('CouponClient', () => {
  it('validateCoupon GETs GetStatoCouponCliente with the two params and returns raw JSON', async () => {
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10' } } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).validateCoupon('C1', 'ABC');
    expect(out).toEqual(raw);
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/GetStatoCouponCliente?');
    expect(url).toContain('codiceInternoCliente=C1');
    expect(url).toContain('codiceCoupon=ABC');
  });

  it('getCartCoupon GETs GetInfoCouponFromDocumento with idElaborazione', async () => {
    const raw = { GetInfoCouponFromDocumentoResult: { m_Item2: { Codice: 'ABC' } } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).getCartCoupon('555');
    expect(out).toEqual(raw);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/GetInfoCouponFromDocumento?idElaborazione=555');
  });

  it('submitCoupon GETs UpdateTestataDocumentoConCoupon with idElaborazione + codiceCoupon', async () => {
    const raw = { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    const out = await makeClient(fetchImpl).submitCoupon('555', 'ABC');
    expect(out).toEqual(raw);
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/UpdateTestataDocumentoConCoupon?');
    expect(url).toContain('idElaborazione=555');
    expect(url).toContain('codiceCoupon=ABC');
  });

  it('verifyPromoItem GETs GetPromozioneBaseXArticolo with all params + default date/valuta', async () => {
    const raw = { GetPromozioneBaseXArticoloResult: {} };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    await makeClient(fetchImpl).verifyPromoItem('C1', 'A1', 'ART1');
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/GetPromozioneBaseXArticolo?');
    expect(url).toContain('codiceInternoCliente=C1');
    expect(url).toContain('codiceIndirizzo=A1');
    expect(url).toContain('codiceInternoArticolo=ART1');
    // MyMB requires these — a missing/wrong dataPrezzatura makes the service throw
    // on DateTime.ParseExact(…, "dd/MM/yyyy"). Default: today dd/MM/yyyy + EUR.
    // Slashes are URL-encoded to %2F in the query string.
    expect(url).toMatch(/dataPrezzatura=\d{2}%2F\d{2}%2F\d{4}/);
    expect(url).toContain('valuta=EUR');
  });

  it('verifyPromoItem forwards an explicit dataPrezzatura and valuta', async () => {
    const raw = { GetPromozioneBaseXArticoloResult: {} };
    const fetchImpl = vi.fn(async () => jsonResponse(raw));
    await makeClient(fetchImpl).verifyPromoItem('C1', 'A1', 'ART1', '15/06/2026', 'USD');
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('dataPrezzatura=15%2F06%2F2026');
    expect(url).toContain('valuta=USD');
  });
});
