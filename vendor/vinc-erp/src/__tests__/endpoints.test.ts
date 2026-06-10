import { describe, it, expect } from 'vitest';
import { MYMB_COUPON_ENDPOINTS } from '../endpoints.js';

describe('MYMB_COUPON_ENDPOINTS', () => {
  it('maps the four coupon services to their MyMB names', () => {
    expect(MYMB_COUPON_ENDPOINTS.GET_STATO_COUPON_CLIENTE).toBe('GetStatoCouponCliente');
    expect(MYMB_COUPON_ENDPOINTS.GET_INFO_COUPON_FROM_DOCUMENTO).toBe('GetInfoCouponFromDocumento');
    expect(MYMB_COUPON_ENDPOINTS.UPDATE_TESTATA_DOCUMENTO_CON_COUPON).toBe('UpdateTestataDocumentoConCoupon');
    expect(MYMB_COUPON_ENDPOINTS.GET_PROMOZIONE_BASE_X_ARTICOLO).toBe('GetPromozioneBaseXArticolo');
  });
});
