import { fetchPimProductList } from '@framework/product/get-pim-product';
import { productToErpPriceData } from '@utils/transform/inline-to-erp';
import type { ErpPriceData } from '@utils/transform/erp-prices';

/** Commerce Suite serves at most 100 products per search (SEARCH_MAX_ROWS). */
export const CART_CHECK_CHUNK = 100;

/**
 * Today's inline (PIM) price data for the given products, exactly as the
 * product pages book them: the same search, with the customer context (so the
 * customer's tier applies), chunked to the search page cap. Products the
 * catalog no longer returns or prices are absent from the map.
 */
export async function fetchCartPriceMap(
  entityCodes: string[],
): Promise<Record<string, ErpPriceData>> {
  const codes = Array.from(new Set(entityCodes.filter(Boolean)));
  const chunks: string[][] = [];
  for (let i = 0; i < codes.length; i += CART_CHECK_CHUNK) {
    chunks.push(codes.slice(i, i + CART_CHECK_CHUNK));
  }
  const pages = await Promise.all(
    chunks.map((chunk) =>
      fetchPimProductList({
        filters: { entity_code: chunk },
        limit: chunk.length,
      }),
    ),
  );
  const map: Record<string, ErpPriceData> = {};
  for (const page of pages) {
    for (const product of page.items) {
      const pd = productToErpPriceData(product);
      if (pd) map[String(product.id)] = pd;
    }
  }
  return map;
}
