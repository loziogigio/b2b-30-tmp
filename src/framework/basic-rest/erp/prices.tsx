import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { transformErpPricesResponse } from '@utils/transform/erp-prices';
import { erpApiPath } from '@framework/utils/erp-api-base';

interface ErpPricesPayload {
  entity_codes: string[];
  quantity_list?: number[];
  id_cart: string;
  customer_code: string;
  address_code: string;
  /** Active theme — when 'time', fetch directly from /api/erp. */
  theme?: string;
}

export const fetchErpPrices = async (input: ErpPricesPayload) => {
  const {
    entity_codes,
    quantity_list,
    id_cart,
    customer_code,
    address_code,
    theme,
  } = input;

  const finalPayload = {
    entity_codes,
    quantity_list: quantity_list ?? new Array(entity_codes.length).fill(1),
    id_cart,
    customer_code,
    address_code,
  };

  let rawResponse: unknown;
  if (theme === 'time') {
    const res = await fetch(erpApiPath('time', API_ENDPOINTS_B2B.ERP_PRICES), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload),
    });
    if (!res.ok) {
      throw new Error(`ERP prices request failed: HTTP ${res.status}`);
    }
    rawResponse = await res.json();
  } else {
    rawResponse = await post(API_ENDPOINTS_B2B.ERP_PRICES, finalPayload);
  }

  return transformErpPricesResponse(rawResponse);
};
