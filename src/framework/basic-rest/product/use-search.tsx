import { QueryOptionsType, Product } from '@framework/types';
import { useQuery } from '@tanstack/react-query';

type SearchQueryKey = [string, QueryOptionsType];

export const fetchSearchedProducts = async ({
  queryKey,
}: {
  queryKey: SearchQueryKey;
}) => {
  const [, options] = queryKey;
  const text = (options?.text as string | undefined)?.trim();

  if (!text) {
    return [] as Product[];
  }

  return [] as Product[];
};

export const useSearchQuery = (options: QueryOptionsType) => {
  const trimmedText = (options?.text as string | undefined)?.trim() ?? '';

  return useQuery({
    queryKey: ['local-search', options] as SearchQueryKey,
    queryFn: fetchSearchedProducts,
    enabled: Boolean(trimmedText),
    staleTime: Infinity,
    retry: false,
  });
};
