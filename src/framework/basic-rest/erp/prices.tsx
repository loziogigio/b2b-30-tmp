import { post } from '@framework/utils/httpPIM';
import { transformErpPricesResponse } from '@utils/transform/erp-prices';

interface ErpPricesPayload {
  entity_codes: string[];
  quantity_list?: number[];
  id_cart: string;
  customer_code: string;
  address_code: string;
}

export const fetchErpPrices = async (input: ErpPricesPayload) => {
  const { entity_codes, quantity_list, id_cart, customer_code, address_code } =
    input;

  const finalPayload = {
    entity_codes,
    quantity_list: quantity_list ?? new Array(entity_codes.length).fill(1),
    id_cart,
    customer_code,
    address_code,
  };

  // Route through PIM pricing proxy instead of calling ERP directly
  const rawResponse = await post('api/b2b/pricing/prices', finalPayload);

  // Transform response into flat ERP price map
  return transformErpPricesResponse(rawResponse);
};
