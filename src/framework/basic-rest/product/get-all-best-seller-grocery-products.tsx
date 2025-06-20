import { QueryOptionsType, Product } from '@framework/types';
import http from '@framework/utils/http';
import { API_ENDPOINTS } from '@framework/utils/api-endpoints';
import { useQuery } from '@tanstack/react-query';

export const fetchBestSellerGroceryProducts = async ({ queryKey }: any) => {
  const { data } = await http.get(API_ENDPOINTS.BEST_SELLER_GROCERY_PRODUCTS);
  return data as Product[];
};
export const useBestSellerGroceryProductsQuery = (
  options: QueryOptionsType,
) => {
  return useQuery<Product[], Error>({
    queryKey: [API_ENDPOINTS.BEST_SELLER_GROCERY_PRODUCTS, options],
    queryFn: () => fetchBestSellerGroceryProducts(options),
  });
};
