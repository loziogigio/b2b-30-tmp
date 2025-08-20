import type { FC } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Alert from '@components/ui/alert';
import Button from '@components/ui/button';
import ProductCardAlpine from '@components/product/product-cards/product-card-alpine';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import cn from 'classnames';
import { useProductsQuery } from '@framework/product/get-all-products';
import { LIMITS } from '@framework/utils/limits';
import { Product } from '@framework/types';
import { useTranslation } from 'src/app/i18n/client';
import useQueryParam from '@utils/use-query-params';
import { useProductListInfinitQuery } from '@framework/product/get-b2b-product';
import ProductCardB2B from './product-cards/product-card-b2b';
import { fetchErpPrices } from '@framework/erp/prices'; // path corretto
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ProductGridProps {
  lang: string;
  className?: string;
}

export const ProductB2BGrid: FC<ProductGridProps> = ({ className = '', lang }) => {
  const { t } = useTranslation(lang, 'common');
  const searchParams = useSearchParams();

  const urlParams: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    urlParams[key] = value;
  });

  const mergedParams = {
    ...urlParams,
    per_page: LIMITS.PRODUCTS_LIMITS,
    customer_code: '026269',// TODO: inject actual customer code
    address_code: '000000'

  };

  const {
    data,
    error,
    isFetching: isLoading,
    fetchNextPage,
    isFetchingNextPage: loadingMore,
    hasNextPage,
  } = useProductListInfinitQuery(mergedParams);

// Extract product IDs as entity_codes (with conditional handling)
const entity_codes = useMemo(() => {
  return (
    data?.pages?.flatMap((page) =>
      page?.items?.flatMap((product: Product) => {
        // Skip if has multiple variations
        if (product.variations?.length > 1) return [];

        // If only 1 variation, use the variation's ID
        if (product.variations?.length === 1) {
          return product.variations[0].id;
        }

        // Default case: use product ID
        return product.id;
      })
    ) ?? []
  );
}, [data]);
  // Only fetch ERP prices if products were loaded
  const erpEnabled = entity_codes.length > 0;

  const erpPayload = {
    entity_codes: entity_codes.map(String),
    id_cart: '0',         // Replace with actual cart ID
    customer_code: '026269',// TODO: inject actual customer code
    address_code: '000000',     // TODO: inject actual address code
  };

  const { data: erpPricesData, isLoading: isLoadingErpPrices } = useQuery({
    queryKey: ['erp-prices', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: erpEnabled,
  });

  return (
    <>
      {/* {erpPricesData && (
        <pre className="mt-10 bg-gray-100 text-sm text-gray-800 p-4 rounded overflow-x-auto">
          {JSON.stringify(erpPricesData, null, 2)}
        </pre>
      )} */}

      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-4 gap-2 md:gap-4 2xl:gap-5',
          className,
        )}
      >
        {error ? (
          <div className="col-span-full">
            <Alert message={error?.message} />
          </div>
        ) : isLoading && !data?.pages?.length ? (
          Array.from({ length: 30 }).map((_, idx) => (
            <ProductCardLoader
              key={`product--key-${idx}`}
              uniqueKey={`product--key-${idx}`}
            />
          ))
        ) : (
          data?.pages?.map((page: any) =>
            page?.items?.map((product: Product) => {
              const variations = Array.isArray(product.variations) ? product.variations : [];
          
              // Decide which product to use
              const isSingleVariation = variations.length === 1;
              const targetProduct = isSingleVariation ? variations[0] : product;
          
              // Always pick the effective ID for ERP lookup
              const erpKey = String(targetProduct.id);
              const priceData = erpPricesData?.[erpKey];
          
              return (
                <ProductCardB2B
                  key={`product--key-${erpKey}`}
                  product={targetProduct}
                  lang={lang}
                  priceData={priceData}
                />
              );
            })
          )
        )}
        {/* end of error state */}
      </div>
      {hasNextPage && (
        <div className="pt-8 text-center xl:pt-10">
          <Button
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => fetchNextPage()}
          >
            {t('button-load-more')}
          </Button>
        </div>
      )}
    </>
  );
};
