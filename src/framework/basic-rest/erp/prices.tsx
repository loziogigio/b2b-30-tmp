import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { transformErpPricesResponse } from '@utils/transform/erp-prices'; // adjust path

interface ErpPricesPayload {
  entity_codes: string[];
  quantity_list?: number[];
  id_cart: string;
  customer_code: string;
  address_code: string;
}

export const fetchErpPrices = async (input: ErpPricesPayload) => {
  const {
    entity_codes,
    quantity_list,
    id_cart,
    customer_code,
    address_code,
  } = input;

  const finalPayload = {
    entity_codes,
    quantity_list: quantity_list ?? new Array(entity_codes.length).fill(1),
    id_cart,
    customer_code,
    address_code,
  };

  const rawResponse = await post(API_ENDPOINTS_B2B.ERP_PRICES, finalPayload);

  // Transform response into flat ERP price map
  return transformErpPricesResponse(rawResponse);
};
