import http from '@framework/utils/http';
import { API_ENDPOINTS } from '@framework/utils/api-endpoints';
import { useQuery } from '@tanstack/react-query';

const fetchAddress = async () => {
  const { data } = await http.get(API_ENDPOINTS.ADDRESS);
  return {
    data: data,
  };
};

const useAddressQuery = () => {
  return useQuery({
    queryKey: [API_ENDPOINTS.ADDRESS],
    queryFn: () => fetchAddress(),
  });
};

export { useAddressQuery, fetchAddress };
