import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  validateCoupon,
  getCartCoupon,
  submitCoupon,
  verifyPromoItem,
  resolveCouponConfig,
  sessionCustomerContext,
} = vi.hoisted(() => ({
  validateCoupon: vi.fn(),
  getCartCoupon: vi.fn(),
  submitCoupon: vi.fn(),
  verifyPromoItem: vi.fn(),
  resolveCouponConfig: vi.fn(),
  sessionCustomerContext: vi.fn(),
}));

vi.mock('vinc-erp', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    CouponClient: vi.fn(function () {
      return { validateCoupon, getCartCoupon, submitCoupon, verifyPromoItem };
    }),
  };
});

vi.mock('@/lib/erp/coupon-config', () => ({ resolveCouponConfig }));
vi.mock('@/lib/profile/session-owner', () => ({ sessionCustomerContext }));
// get_multiple_prices path is untouched; stub the ERP factory so the module imports cleanly.
vi.mock('@/lib/erp/factory', () => ({ getMyMbErpClient: vi.fn() }));

import { POST } from '@/app/api/erp/[...path]/route';
import { NextRequest } from 'next/server';

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost/api/erp/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const params = (p: string) => ({ params: Promise.resolve({ path: [p] }) });

describe('coupon proxy cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionCustomerContext.mockResolvedValue({
      owned: new Map([['C', new Set(['A'])]]),
      erpCodeById: new Map([['C', 'C']]),
      token: 'token',
    });
    resolveCouponConfig.mockResolvedValue({
      enabled: true,
      baseUrl: 'http://c/web',
      authHeader: 'Basic ' + Buffer.from('u:p').toString('base64'),
    });
  });

  // No url/auth in the apply descriptor — the Windmill worker uses its own
  // internal ERP connection; the payload only documents the call shape.
  const apply = (codiceCoupon: string) => ({
    method: 'GET',
    params: { codiceCoupon, idElaborazione: null },
  });

  it('validate_coupon echoes the MyMB JSON', async () => {
    const raw = {
      GetStatoCouponClienteResult: {
        m_Item2: { isValido: 'S', percentualeSconto: '10' },
      },
    };
    validateCoupon.mockResolvedValue(raw);
    const res = await POST(
      req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }),
      params('validate_coupon'),
    );
    const json = await res.json();
    expect(json).toEqual({ status: 'success', data: raw, apply: apply('AB') });
    expect(validateCoupon).toHaveBeenCalledWith('C', 'AB');
  });

  it.each(['check_coupon_cart', 'submit_coupon'])(
    'denies %s without a server-owned cart mapping',
    async (endpoint) => {
      const res = await POST(
        req(endpoint, {
          codiceInternoCliente: 'C',
          id_cart: '9',
          idElaborazione: '9',
          codiceCoupon: 'AB',
        }),
        params(endpoint),
      );
      expect(res.status).toBe(403);
      expect(getCartCoupon).not.toHaveBeenCalled();
      expect(submitCoupon).not.toHaveBeenCalled();
      expect(validateCoupon).not.toHaveBeenCalled();
    },
  );

  it('verify_promo_item forwards the three params and echoes the JSON', async () => {
    const raw = { GetPromozioneBaseXArticoloResult: {} };
    verifyPromoItem.mockResolvedValue(raw);
    const res = await POST(
      req('verify_promo_item', {
        codiceInternoCliente: 'C',
        codiceIndirizzo: 'A',
        codiceInternoArticolo: 'ART1',
      }),
      params('verify_promo_item'),
    );
    const json = await res.json();
    expect(verifyPromoItem).toHaveBeenCalledWith(
      'C',
      'A',
      'ART1',
      undefined,
      undefined,
    );
    expect(json).toEqual({ status: 'success', data: raw });
  });

  it('disabled config short-circuits without calling MyMB', async () => {
    resolveCouponConfig.mockResolvedValue({
      enabled: false,
      baseUrl: '',
      authHeader: '',
    });
    const res = await POST(
      req('validate_coupon', { codiceInternoCliente: 'C', codiceCoupon: 'AB' }),
      params('validate_coupon'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('error');
    expect(validateCoupon).not.toHaveBeenCalled();
  });
});
