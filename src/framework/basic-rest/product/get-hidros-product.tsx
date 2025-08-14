import { Product } from '@framework/types';
import http from '@framework/utils/http';
import { API_ENDPOINTS } from '@framework/utils/api-endpoints';
import { useQuery } from '@tanstack/react-query';

export const fetchProduct = async (_slug: string) => {
  const { data } = await http.get(`${API_ENDPOINTS.HIDROS_PRODUCT_DEMO}`);
  return data;
};
export const useProductQuery = (slug: string) => {
  return useQuery<Product, Error>({
    queryKey: [API_ENDPOINTS.HIDROS_PRODUCT_DEMO, slug],
    queryFn: () => fetchProduct(slug),
  });
};
