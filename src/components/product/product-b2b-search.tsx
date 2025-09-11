import type { FC } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from '@components/ui/alert';
import Button from '@components/ui/button';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import { LIMITS } from '@framework/utils/limits';
import { Product } from '@framework/types';
import { useTranslation } from 'src/app/i18n/client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useProductListInfinitQuery } from '@framework/product/get-b2b-product';
import ProductCardB2B from './product-cards/product-card-b2b';
import ProductRowB2B from './product-rows/product-row-b2b';
import { fetchErpPrices } from '@framework/erp/prices';
import { useMemo, useEffect, useRef, useState } from 'react';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { getUserLikes as apiGetUserLikes, getTrendingProductsPage as apiGetTrendingPage } from '@framework/likes';
import { post } from '@framework/utils/httpB2B';
import { API_ENDPOINTS_B2B } from '@framework/utils/api-endpoints-b2b';
import { transformProduct, RawProduct, transformSearchParams } from '@utils/transform/b2b-product';

interface ProductSearchProps {
  lang: string;
  className?: string;
}

export const ProductB2BSearch: FC<ProductSearchProps> = ({ className = '', lang }) => {
  const { t } = useTranslation(lang, 'common');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // view from query
  const viewParam = (searchParams.get('view') || 'grid').toLowerCase();
  const isList = viewParam === 'list';
  const setView = (next: 'grid' | 'list') => {
    const params = new URLSearchParams(searchParams as any);
    if (next === 'grid') params.delete('view'); else params.set('view', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // params for API
  const urlParams: Record<string, string> = {};
  searchParams.forEach((v, k) => (urlParams[k] = v));

  const mergedParams = {
    ...urlParams,
    per_page: LIMITS.PRODUCTS_LIMITS,
    ...ERP_STATIC
  };

  const source = (searchParams.get('source') || '').toLowerCase();
  const period = (searchParams.get('period') || '7d').toLowerCase();
  const pageSizeParam = Math.min(100, Math.max(1, Number(searchParams.get('page_size') || 24)));

  const likesOrTrending = source === 'likes' || source === 'trending';

  const likesTrendingQuery = useInfiniteQuery({
    queryKey: ['search-special', source, period, pageSizeParam],
    queryFn: async ({ pageParam = 1 }) => {
      if (source === 'likes') {
        const res = await apiGetUserLikes(pageParam, pageSizeParam);
        const skus = (res?.likes || []).map((l: any) => l.sku).filter(Boolean);
        if (!skus.length) {
          return { items: [], nextPage: null };
        }
        const searchParams = transformSearchParams({
          start: 0,
          rows: skus.length,
          search: { sku: skus.join(';') },
        } as any);
        const resp = await post<{ results: RawProduct[]; numFound: number }>(API_ENDPOINTS_B2B.SEARCH, searchParams);
        const items = transformProduct(resp?.results || []);
        const nextPage = res?.has_next ? pageParam + 1 : null;
        return { items, nextPage };
      }
      // trending: paginated response
      const trendingPage = await apiGetTrendingPage(period, pageParam, pageSizeParam, false);
      const skus = (trendingPage?.items || []).map((x: any) => x.sku).filter(Boolean);
      if (!skus.length) return { items: [], nextPage: null };
      const searchParams = transformSearchParams({
        start: 0,
        rows: skus.length,
        search: { sku: skus.join(';') },
      } as any);
      const resp = await post<{ results: RawProduct[]; numFound: number }>(API_ENDPOINTS_B2B.SEARCH, searchParams);
      const items = transformProduct(resp?.results || []);
      const nextPage = trendingPage?.has_next ? pageParam + 1 : null;
      return { items, nextPage };
    },
    enabled: likesOrTrending,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const baseQuery = useProductListInfinitQuery(mergedParams);

  const data = likesOrTrending ? likesTrendingQuery.data : baseQuery.data;
  const error = likesOrTrending ? likesTrendingQuery.error as any : baseQuery.error;
  const isLoading = likesOrTrending ? likesTrendingQuery.isFetching : baseQuery.isFetching;
  const fetchNextPage = likesOrTrending ? likesTrendingQuery.fetchNextPage : baseQuery.fetchNextPage;
  const loadingMore = likesOrTrending ? likesTrendingQuery.isFetchingNextPage : baseQuery.isFetchingNextPage;
  const hasNextPage = likesOrTrending ? !!likesTrendingQuery.hasNextPage : baseQuery.hasNextPage;

  // ⬇️ Include ALL variant ids so list view has prices when expanded
  // --- ERP prices: fetch only for newly loaded page and merge
  const [erpPricesMap, setErpPricesMap] = useState<Record<string, ErpPriceData>>({});
  const fetchedCodesRef = useRef<Set<string>>(new Set());

  // Reset ERP cache when search signature changes
  const searchSignature = useMemo(() => {
    const base = searchParams.toString();
    if (likesOrTrending) {
      return source === 'likes' ? `likes:${pageSizeParam}` : `trending:${period}:${pageSizeParam}`;
    }
    return `base:${base}`;
  }, [likesOrTrending, source, period, pageSizeParam, searchParams]);

  const prevSig = useRef<string>('');
  useEffect(() => {
    if (prevSig.current !== searchSignature) {
      prevSig.current = searchSignature;
      setErpPricesMap({});
      fetchedCodesRef.current = new Set();
    }
  }, [searchSignature]);

  const lastItems: Product[] = useMemo(() => {
    const pages = (data as any)?.pages;
    if (!pages?.length) return [];
    const last = pages[pages.length - 1];
    return last?.items ?? [];
  }, [data]);

  const newCodes = useMemo(() => {
    const codes: string[] = [];
    for (const p of lastItems as any[]) {
      const vars = Array.isArray(p?.variations) ? p.variations : [];
      if (vars.length > 0) {
        for (const v of vars) codes.push(String(v?.id ?? ''));
      } else {
        codes.push(String((p as any)?.id ?? ''));
      }
    }
    return codes.filter((c) => c && !fetchedCodesRef.current.has(c));
  }, [lastItems]);

  useEffect(() => {
    if (!newCodes.length) return;
    const payload = { entity_codes: newCodes, ...ERP_STATIC } as any;
    let mounted = true;
    fetchErpPrices(payload)
      .then((res) => {
        if (!mounted || !res) return;
        setErpPricesMap((prev) => ({ ...prev, ...(res as any) }));
        for (const c of newCodes) fetchedCodesRef.current.add(c);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [newCodes]);

  const getPrice = (id: string | number) => erpPricesMap[String(id)];

  return (
    <>
      {/* view toggle */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={() => setView('grid')}
          className={cn(
            'h-9 px-3 rounded border text-sm',
            !isList ? 'bg-brand text-white border-brand' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
          aria-pressed={!isList}
        >
          {t('grid', { defaultValue: 'Grid' })}
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'h-9 px-3 rounded border text-sm',
            isList ? 'bg-brand text-white border-brand' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
          aria-pressed={isList}
        >
          {t('list', { defaultValue: 'List' })}
        </button>
      </div>

      <div
        className={cn(
          isList
            ? 'grid grid-cols-1 gap-3'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-4 gap-2 md:gap-4 2xl:gap-5',
          className
        )}
      >
        {error ? (
          <div className="col-span-full">
            <Alert message={error?.message} />
          </div>
        ) : isLoading && !data?.pages?.length ? (
          Array.from({ length: 30 }).map((_, idx) => (
            <ProductCardLoader key={`product--key-${idx}`} uniqueKey={`product--key-${idx}`} />
          ))
        ) : (
          data?.pages?.map((page: any) =>
            page?.items?.map((p: Product) => {

              // grid: same as before (flatten single-variation)
              const vars = Array.isArray(p.variations) ? p.variations : [];
              const isSingle = vars.length === 1;
              const target = isSingle ? vars[0] : p;
              const priceData = getPrice(target.id);

                            
              if (isList) {
                // list: always render parent row; variants appear in the row itself
                return (
                  <ProductRowB2B
                    key={`row-${target.id}`}
                    lang={lang}
                    product={target}
                    getPrice={getPrice}
                    priceData={priceData}
                  />
                );
              }


              return (
                <ProductCardB2B
                  key={`card-${target.id}`}
                  product={target}
                  lang={lang}
                  priceData={priceData}
                />
              );
            })
          )
        )}
      </div>

      {hasNextPage && (
        <div className="pt-8 text-center xl:pt-10">
          <Button loading={loadingMore} disabled={loadingMore} onClick={() => fetchNextPage()}>
            {t('button-load-more')}
          </Button>
        </div>
      )}
    </>
  );
};
