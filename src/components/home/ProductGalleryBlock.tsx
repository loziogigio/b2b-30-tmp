'use client';

import cn from 'classnames';
import { useMemo } from 'react';
import { Product } from '@framework/types';
import ProductCardB2B from '@components/product/product-cards/product-card-b2b';
import ProductCardLoader from '@components/ui/loaders/product-card-loader';
import { fetchErpPrices } from '@framework/erp/prices';
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';

type ProductGalleryBlockProps = {
  products: Product[];
  columns: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  gap?: number;
  lang: string;
  loading?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const columnClass = (
  size: 'base' | 'sm' | 'md' | 'lg' | 'xl',
  count: number,
) => {
  const clamped = clamp(Math.round(count), 1, 6);
  const prefix = size === 'base' ? '' : `${size}:`;
  switch (clamped) {
    case 1:
      return `${prefix}grid-cols-1`;
    case 2:
      return `${prefix}grid-cols-2`;
    case 3:
      return `${prefix}grid-cols-3`;
    case 4:
      return `${prefix}grid-cols-4`;
    case 5:
      return `${prefix}grid-cols-5`;
    default:
      return `${prefix}grid-cols-6`;
  }
};

export const ProductGalleryBlock = ({
  products,
  columns,
  gap = 16,
  lang,
  loading = false,
}: ProductGalleryBlockProps) => {
  const { isAuthorized } = useUI();

  // Collect entity_codes for ERP price lookup
  const entity_codes = useMemo<string[]>(() => {
    if (!Array.isArray(products)) return [];
    return products
      .map((p: any) => {
        const variations = Array.isArray(p?.variations) ? p.variations : [];
        if (variations.length === 1) return String(variations[0]?.id ?? '');
        if (variations.length > 1) return ''; // skip multi-variation items for ERP lookup
        return String(p?.id ?? '');
      })
      .filter((v) => v && v !== '');
  }, [products]);

  const erpEnabled = entity_codes.length > 0;

  const erpPayload = {
    entity_codes,
    ...ERP_STATIC,
  };

  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthorized && erpEnabled,
  });

  if (!Array.isArray(products) || products.length === 0) {
    if (loading) {
      // Show loading placeholders
      const mobileCols = clamp(columns?.mobile ?? 1, 1, 4);
      const tabletCols = clamp(
        columns?.tablet ?? Math.max(mobileCols, 2),
        mobileCols,
        5,
      );
      const desktopCols = clamp(
        columns?.desktop ?? Math.max(tabletCols, 4),
        tabletCols,
        6,
      );

      const gridClasses = cn(
        'grid',
        columnClass('base', mobileCols),
        columnClass('sm', tabletCols),
        columnClass('lg', desktopCols),
      );

      return (
        <div className={gridClasses} style={{ gap }}>
          {Array.from({ length: desktopCols }).map((_, idx) => (
            <ProductCardLoader
              key={`loader-${idx}`}
              uniqueKey={`gallery-loader-${idx}`}
            />
          ))}
        </div>
      );
    }
    return null;
  }

  const mobileCols = clamp(columns?.mobile ?? 1, 1, 4);
  const tabletCols = clamp(
    columns?.tablet ?? Math.max(mobileCols, 2),
    mobileCols,
    5,
  );
  const desktopCols = clamp(
    columns?.desktop ?? Math.max(tabletCols, 4),
    tabletCols,
    6,
  );

  const gridClasses = cn(
    'grid',
    columnClass('base', mobileCols),
    columnClass('sm', tabletCols),
    columnClass('lg', desktopCols),
  );

  return (
    <div className={gridClasses} style={{ gap }}>
      {products.map((product) => {
        // Normalize: if exactly one variation, treat it as the product
        const variations = Array.isArray(product?.variations)
          ? product.variations
          : [];
        const isSingleVariation = variations.length === 1;

        // Merge the single variation over the parent so we keep any missing fields (image, brand, etc.)
        const targetProduct = isSingleVariation
          ? {
              ...product,
              ...variations[0],
              id_parent: (product as any).id_parent ?? product.id,
              parent_sku: (product as any).parent_sku ?? product.sku,
              image: variations[0]?.image ?? product.image,
              gallery:
                (variations[0]?.gallery?.length
                  ? variations[0].gallery
                  : (product as any).gallery) ?? [],
              variations: [], // flattened after normalization
            }
          : product;

        // Effective key for ERP lookup
        const erpKey = String(targetProduct?.id ?? product?.id ?? '');
        const priceData = erpPricesData?.[erpKey];

        return (
          <ProductCardB2B
            key={`gallery-${erpKey}`}
            product={targetProduct}
            lang={lang}
            priceData={priceData}
          />
        );
      })}
    </div>
  );
};

export default ProductGalleryBlock;
