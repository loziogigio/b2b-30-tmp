import { describe, it, expect, vi, beforeEach } from 'vitest';

const { validateCoupon, getCartCoupon, submitCoupon, verifyPromoItem, resolveCouponConfig } = vi.hoisted(() => ({
  validateCoupon: vi.fn(),
  getCartCoupon: vi.fn(),
  submitCoupon: vi.fn(),
  verifyPromoItem: vi.fn(),
  resolveCouponConfig: vi.fn(),
}));

vi.mock('vinc-erp', async (orig) => {
  const actual = await (orig as any)();
  return { ...actual, CouponClient: vi.fn(function () { return { validateCoupon, getCartCoupon, submitCoupon, verifyPromoItem }; }) };
});

vi.mock('@/lib/erp/coupon-config', () => ({ resolveCouponConfig }));
// get_multiple_prices path is untouched; stub the ERP factory so the module imports cleanly.
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: vi.fn() }));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
const params = (p: string) => ({ params: Promise.resolve({ path: [p] }) });

describe('coupon proxy cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCouponConfig.mockResolvedValue({ enabled: true, baseUrl: 'http://c/web', authHeader: 'Basic x' });
  });

  it('validate_coupon echoes the MyMB JSON', async () => {
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '10' } } };
    validateCoupon.mockResolvedValue(raw);
    const res = await POST(req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }), params('validate_coupon'));
    const json = await res.json();
    expect(json).toEqual({ status: 'success', data: raw });
    expect(validateCoupon).toHaveBeenCalledWith('C', 'AB');
  });

  it('check_coupon_cart does the two-step lookup + validation', async () => {
    getCartCoupon.mockResolvedValue({ GetInfoCouponFromDocumentoResult: { m_Item2: { Codice: 'AB' } } });
    const raw = { GetStatoCouponClienteResult: { m_Item2: { isValido: 'S', percentualeSconto: '5' } } };
    validateCoupon.mockResolvedValue(raw);
    const res = await POST(req('check_coupon_cart', { codiceInternoCliente: 'C', id_cart: '9' }), params('check_coupon_cart'));
    const json = await res.json();
    expect(getCartCoupon).toHaveBeenCalledWith('9');
    expect(validateCoupon).toHaveBeenCalledWith('C', 'AB');
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('check_coupon_cart with no coupon on the cart returns a soft error', async () => {
    getCartCoupon.mockResolvedValue({ GetInfoCouponFromDocumentoResult: { m_Item2: {} } });
    const res = await POST(req('check_coupon_cart', { codiceInternoCliente: 'C', id_cart: '9' }), params('check_coupon_cart'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(validateCoupon).not.toHaveBeenCalled();
  });

  it('submit_coupon forwards idElaborazione + codiceCoupon', async () => {
    const raw = { UpdateTestataDocumentoConCouponResult: { ReturnCode: 0 } };
    submitCoupon.mockResolvedValue(raw);
    const res = await POST(req('submit_coupon', { idElaborazione: '9', codiceCoupon: 'AB' }), params('submit_coupon'));
    const json = await res.json();
    expect(submitCoupon).toHaveBeenCalledWith('9', 'AB');
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('verify_promo_item forwards the three params and echoes the JSON', async () => {
    const raw = { GetPromozioneBaseXArticoloResult: {} };
    verifyPromoItem.mockResolvedValue(raw);
    const res = await POST(
      req('verify_promo_item', { codiceInternoCliente: 'C', codiceIndirizzo: 'A', codiceInternoArticolo: 'ART1' }),
      params('verify_promo_item'),
    );
    const json = await res.json();
    expect(verifyPromoItem).toHaveBeenCalledWith('C', 'A', 'ART1');
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('disabled config short-circuits without calling MyMB', async () => {
    resolveCouponConfig.mockResolvedValue({ enabled: false, baseUrl: '', authHeader: '' });
    const res = await POST(req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }), params('validate_coupon'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(validateCoupon).not.toHaveBeenCalled();
  });
});
