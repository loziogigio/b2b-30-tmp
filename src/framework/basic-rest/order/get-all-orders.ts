import { QueryOptionsType, Order } from '@framework/types';
import http from '@framework/utils/http';
import { API_ENDPOINTS } from '@framework/utils/api-endpoints';
import { useQuery } from '@tanstack/react-query';

const fetchOrders = async () => {
  const { data } = await http.get(API_ENDPOINTS.ORDERS);
  return {
    data: data,
  };
};

const useOrdersQuery = (options: QueryOptionsType) => {
  return useQuery({
    queryKey: [API_ENDPOINTS.ORDERS, options],
    queryFn: fetchOrders,
  });
};

export { useOrdersQuery, fetchOrders };
