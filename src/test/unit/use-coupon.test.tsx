import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoupon, verifyPromoItem } from '@/hooks/use-coupon';

const okValidate = { status: 'success', data: { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10', Messaggio: 'ok' } } } };
const okPersist = { status: 'success', data: { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } } };

describe('useCoupon', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('applyCoupon validates only and sets discountPercent (no persist call)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(okValidate)));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    expect(result.current.discountPercent).toBe(10);
    expect(result.current.status).toBe('valid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/erp/validate_coupon');
  });

  it('applyCoupon surfaces the message + zero discount on an invalid coupon', async () => {
    const bad = { status: 'success', data: { GetStatoCouponClienteResult: { m_Item2: { isValido: 'N', Messaggio: 'nope' } } } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad))));
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    expect(result.current.discountPercent).toBe(0);
    expect(result.current.status).toBe('invalid');
    expect(result.current.message).toBe('nope');
  });

  it('persistCoupon posts submit_coupon only when a valid coupon is applied', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(okValidate)))   // applyCoupon
      .mockResolvedValueOnce(new Response(JSON.stringify(okPersist)));   // persistCoupon
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    await act(async () => { await result.current.applyCoupon('AB'); });
    let ok = false;
    await act(async () => { ok = await result.current.persistCoupon(); });
    expect(ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/erp/submit_coupon');
    const body = JSON.parse((fetchMock.mock.calls[1][1] as any).body);
    expect(body).toEqual({ idElaborazione: '9', codiceCoupon: 'AB' });
  });

  it('persistCoupon is a no-op (returns false) when no valid coupon is applied', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCoupon({ customerCode: 'C', idCart: '9' }));
    let ok = true;
    await act(async () => { ok = await result.current.persistCoupon(); });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verifyPromoItem', () => {
  it('posts the three params and returns data on success', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { promo: 1 } })));
    vi.stubGlobal('fetch', fetchMock);
    const out = await verifyPromoItem('C', 'A', 'ART1');
    expect(out).toEqual({ promo: 1 });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(body).toEqual({ codiceInternoCliente: 'C', codiceIndirizzo: 'A', codiceInternoArticolo: 'ART1' });
  });

  it('returns null when the customer is missing', async () => {
    expect(await verifyPromoItem('0', 'A', 'ART1')).toBeNull();
  });
});
