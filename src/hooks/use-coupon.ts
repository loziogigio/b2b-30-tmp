'use client';

import { useCallback, useState } from 'react';

type Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export interface UseCouponArgs {
  customerCode: string;
  idCart: string | number;
}

const ERP = (endpoint: string, body: unknown) =>
  fetch(`/api/erp/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

function readValidation(json: any): { ok: boolean; percent: number; message: string } {
  const m = json?.data?.GetStatoCouponClienteResult?.m_Item2 ?? {};
  const ok = m.isValido === 'S';
  const percent = ok ? Math.abs(parseFloat(m.percentualeSconto ?? '0')) || 0 : 0;
  return { ok, percent, message: m.Messaggio ?? '' };
}

export function useCoupon({ customerCode, idCart }: UseCouponArgs) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [message, setMessage] = useState('');

  /** Validate only — display math, no persistence (persist happens at order submit). */
  const applyCoupon = useCallback(async (input: string) => {
    setStatus('loading'); setMessage('');
    try {
      const json = await ERP('validate_coupon', { codiceInternoCliente: customerCode, codiceCoupon: input });
      if (json?.status !== 'success') {
        setStatus('error'); setMessage(json?.message ?? 'Errore'); setDiscountPercent(0); return false;
      }
      const v = readValidation(json);
      setCode(input);
      setDiscountPercent(v.percent); setMessage(v.message);
      setStatus(v.ok ? 'valid' : 'invalid');
      return v.ok;
    } catch (e) {
      setStatus('error'); setMessage((e as Error).message); setDiscountPercent(0); return false;
    }
  }, [customerCode]);

  /** Persist the applied coupon onto the cart/document. Called by the order-submit CTA. */
  const persistCoupon = useCallback(async (): Promise<boolean> => {
    if (status !== 'valid' || !code) return false;
    try {
      const json = await ERP('submit_coupon', { idElaborazione: idCart, codiceCoupon: code });
      const rc = json?.data?.UpdateTestataDocumentoConCouponResult?.ReturnCode;
      return json?.status === 'success' && rc === 0;
    } catch {
      return false;
    }
  }, [status, code, idCart]);

  /** Re-display a coupon already saved on the cart (checkout mount). */
  const checkCouponCart = useCallback(async () => {
    try {
      const json = await ERP('check_coupon_cart', { codiceInternoCliente: customerCode, id_cart: idCart });
      if (json?.status !== 'success') { setStatus('idle'); setDiscountPercent(0); return; }
      const v = readValidation(json);
      setDiscountPercent(v.percent); setMessage(v.message); setStatus(v.ok ? 'valid' : 'invalid');
    } catch {
      setStatus('idle'); setDiscountPercent(0);
    }
  }, [customerCode, idCart]);

  return { code, setCode, status, discountPercent, message, applyCoupon, persistCoupon, checkCouponCart };
}

/** Per-article promo (separate from coupons). Returns the raw MyMB JSON or null. */
export async function verifyPromoItem(
  customerCode: string, addressCode: string, entityCode: string,
): Promise<any | null> {
  if (!customerCode || customerCode === '0' || !entityCode) return null;
  try {
    const json = await ERP('verify_promo_item', {
      codiceInternoCliente: customerCode, codiceIndirizzo: addressCode, codiceInternoArticolo: entityCode,
    });
    return json?.status === 'success' ? json.data : null;
  } catch {
    return null;
  }
}
