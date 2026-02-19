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
import { HiOutlineCube } from 'react-icons/hi2';

interface ProductGridProps {
  lang: string;
  className?: string;
}

export const ProductGrid: FC<ProductGridProps> = ({ className = '', lang }) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = usePathname();
  const { getParams, query } = useQueryParam(pathname ?? '/');
  const newQuery: any = getParams(
    // @ts-ignore
    `${process.env.NEXT_PUBLIC_WEBSITE_URL}${query}`,
  );

  const {
    isFetching: isLoading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    data,
    error,
  } = useProductsQuery({
    limit: LIMITS.PRODUCTS_LIMITS,
    // @ts-ignore
    newQuery,
  });

  // Check if there are any products in the data
  const hasProducts = data?.pages?.some((page: any) => page?.data?.length > 0);
  const isEmptyResult =
    !isLoading && !error && data?.pages?.length && !hasProducts;

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 md:gap-4 2xl:gap-5',
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
        ) : isEmptyResult ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <HiOutlineCube className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('text-no-products-found', {
                defaultValue: 'Nessun prodotto trovato',
              })}
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              {t('text-no-products-found-desc', {
                defaultValue:
                  'Non abbiamo trovato prodotti corrispondenti alla tua ricerca. Prova a modificare i filtri o la ricerca.',
              })}
            </p>
          </div>
        ) : (
          data?.pages?.map((page: any) => {
            return page?.data?.map((product: Product) => (
              <ProductCardAlpine
                key={`product--key-${product.id}`}
                product={product}
                lang={lang}
              />
            ));
          })
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
