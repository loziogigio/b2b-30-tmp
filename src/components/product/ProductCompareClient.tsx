'use client';

import { useEffect, useMemo, useState } from 'react';
import Container from '@components/ui/container';
import {
  ProductComparisonTable,
  type ComparisonProduct,
  type ComparisonFeature,
} from './ProductComparisonTable';
import { useCompareList } from '@/contexts/compare/compare.context';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@framework/types';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { fetchErpPrices } from '@framework/erp/prices';
import { ERP_STATIC } from '@framework/utils/static';
import { useUI } from '@contexts/ui.context';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import { useQuery } from '@tanstack/react-query';
import { getAvailabilityDisplay } from '@utils/format-availability';
import { exportToExcel, exportToPDF } from '@utils/export-comparison';
import { useTranslation } from 'src/app/i18n/client';

interface ProductCompareClientProps {
  lang: string;
}

const normalizeFeatureValue = (entry: any) => {
  if (entry == null) return '—';
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'number') return String(entry);
  if (typeof entry === 'object') {
    if (entry.value) return String(entry.value);
    if (entry.description) return String(entry.description);
    if (entry.text) return String(entry.text);
  }
  return '—';
};

const mapProductToComparison = (
  product: Product,
  priceData?: ErpPriceData,
  lang: string = 'it',
): ComparisonProduct => {
  // Handle features as either array or object
  let technicalFeatures: ComparisonFeature[] = [];

  // Check product.features first (legacy B2B format)
  if (Array.isArray(product.features)) {
    // Features as array
    technicalFeatures = product.features.map((feature: any, index: number) => ({
      label:
        feature?.label ||
        feature?.name ||
        feature?.title ||
        `Spec ${index + 1}`,
      value: normalizeFeatureValue(feature),
    }));
  } else if (product.features && typeof product.features === 'object') {
    // Features as object (key-value pairs) - convert to array and sort by key
    technicalFeatures = Object.entries(product.features)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort alphabetically by key
      .map(([key, value]) => ({
        label: key,
        value: String(value ?? '—'),
      }));
  }

  // If no features found, check product.attributes (PIM format)
  if (technicalFeatures.length === 0 && (product as any).attributes) {
    const attrs = (product as any).attributes;

    // PIM attributes can be: { it: { key: { label, value } } } or { key: { label, value } } or array
    if (Array.isArray(attrs)) {
      // Array format: [{ key, label, value }]
      technicalFeatures = attrs
        .filter((a: any) => a?.label && a?.value)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((a: any) => ({
          label: a.label,
          value: String(a.value ?? '—'),
        }));
    } else if (typeof attrs === 'object') {
      // Object format - check for language key first
      const langAttrs = attrs[lang] || attrs['it'] || attrs;

      if (typeof langAttrs === 'object' && !Array.isArray(langAttrs)) {
        technicalFeatures = Object.entries(langAttrs)
          .filter(
            ([_, v]: [string, any]) => v && typeof v === 'object' && v.label,
          )
          .sort(
            ([_, a]: [string, any], [__, b]: [string, any]) =>
              (a.order ?? 0) - (b.order ?? 0),
          )
          .map(([_, v]: [string, any]) => ({
            label: v.label,
            value: String(v.value ?? '—'),
          }));
      }
    }
  }

  const baseFeatures: ComparisonFeature[] = [
    {
      label: 'SKU',
      value: product.sku || '—',
    },
    {
      label: 'Brand',
      value: product.brand?.name || '—',
    },
    {
      label: 'Availability',
      value: getAvailabilityDisplay(priceData),
      highlight: priceData ? Number(priceData.availability) > 0 : false,
    },
  ];

  return {
    id: product.id?.toString() ?? product.sku,
    sku: product.sku,
    title: product.name ?? product.sku,
    model: product.model ?? '',
    status:
      priceData && Number(priceData.availability) > 0
        ? 'available'
        : 'coming-soon',
    availabilityText: getAvailabilityDisplay(priceData),
    imageUrl: product.image?.original || product.image?.thumbnail || undefined,
    description: product.description,
    priceData: priceData, // Pass full ERP price data for PriceAndPromo component
    tags: product.tag?.map((tag) => tag?.name || tag?.slug).filter(Boolean) as
      | string[]
      | undefined,
    features: [...baseFeatures, ...technicalFeatures],
    _originalProduct: product, // Keep original product for modal
  };
};

export default function ProductCompareClient({
  lang,
}: ProductCompareClientProps) {
  const { t } = useTranslation(lang, 'common');
  const urlSearchParams = useSearchParams();
  const { skus, addSku, removeSku, clear } = useCompareList();
  const { isAuthorized } = useUI();
  const [erpPricesMap, setErpPricesMap] = useState<
    Record<string, ErpPriceData>
  >({});

  // Auto add pivot SKU from query param
  useEffect(() => {
    const pivot = urlSearchParams.get('pivot_sku');
    if (pivot) {
      addSku(pivot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchParams]);

  // Limit to 30 products max
  const limitedSkus = useMemo(() => skus.slice(0, 30), [skus]);

  // Memoize search params for PIM API
  const queryParams = useMemo(
    () => ({
      lang,
      rows: 30,
      filters: { sku: limitedSkus },
    }),
    [limitedSkus, lang],
  );

  // Fetch products using PIM search with SKU filter
  const {
    data: rawProducts,
    isLoading,
    error: queryError,
  } = usePimProductListQuery(queryParams, { enabled: limitedSkus.length > 0 });

  // ---- ERP: collect entity_codes from children or parent ----
  // For comparison, we need prices for ALL children (unlike carousel which skips multi-variation)
  const entity_codes = useMemo<string[]>(() => {
    if (!Array.isArray(rawProducts)) return [];
    const codes: string[] = [];

    rawProducts.forEach((p: any) => {
      const variations = Array.isArray(p?.variations) ? p.variations : [];

      if (variations.length > 0) {
        // Has children: collect all children entity_codes (use child ID)
        variations.forEach((child: any) => {
          const childId = String(child?.id ?? '');
          if (childId) codes.push(childId);
        });
      } else {
        // No children: use parent entity_code (parent ID)
        const parentId = String(p?.id ?? '');
        if (parentId) codes.push(parentId);
      }
    });

    return codes.filter(Boolean);
  }, [rawProducts]);

  const erpEnabled = entity_codes.length > 0;

  const erpPayload = useMemo(
    () => ({
      entity_codes,
      ...ERP_STATIC,
    }),
    [entity_codes],
  );

  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices-compare', erpPayload],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthorized && erpEnabled,
  });

  // Update ERP prices map when data arrives
  useEffect(() => {
    if (erpPricesData) {
      setErpPricesMap(erpPricesData as Record<string, ErpPriceData>);
    }
  }, [erpPricesData]);

  // Map products to comparison format with ERP prices
  const products = useMemo(() => {
    if (!rawProducts?.length) return [];

    const map = new Map<string, ComparisonProduct>();
    const orderedProducts: ComparisonProduct[] = [];

    rawProducts.forEach((item) => {
      if (!item) return;

      const variations = Array.isArray(item.variations) ? item.variations : [];

      // If product has children_items (variations), add each child as separate comparison item
      if (variations.length > 0) {
        variations.forEach((child) => {
          if (!child?.sku) return;

          // Get ERP price for this child variation
          const childId = String(child?.id ?? '');
          const priceData = erpPricesMap[childId];

          const comparisonProduct = mapProductToComparison(
            child,
            priceData,
            lang,
          );
          map.set(child.sku.toLowerCase(), comparisonProduct);
        });
      } else {
        // No variations: add parent product directly
        if (!item.sku) return;

        const parentId = String(item?.id ?? '');
        const priceData = erpPricesMap[parentId];

        const comparisonProduct = mapProductToComparison(item, priceData, lang);
        map.set(item.sku.toLowerCase(), comparisonProduct);
      }
    });

    // Match SKUs from compare list (case-insensitive), preserve order
    limitedSkus.forEach((searchSku) => {
      const product = map.get(searchSku.toLowerCase());
      if (product && !orderedProducts.includes(product)) {
        orderedProducts.push(product);
      }
    });

    return orderedProducts;
  }, [rawProducts, erpPricesMap, limitedSkus, lang]);

  const hintText = t('text-product-comparison-hint');

  const hasProducts = products.length > 0;

  const handleExportExcel = () => {
    if (!hasProducts) return;
    exportToExcel(products);
  };

  const handleExportPDF = async () => {
    if (!hasProducts) return;
    await exportToPDF(products);
  };

  return (
    <Container className="py-10 space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">
            {t('text-product-comparison')}
          </h1>
          <p className="max-w-3xl text-base text-slate-600">{hintText}</p>
        </div>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_25px_45px_rgba(15,23,42,0.05)] backdrop-blur">
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!hasProducts}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('text-export-excel')}
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={!hasProducts}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('text-export-pdf')}
        </button>
      </section>

      {skus.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-[0_25px_45px_rgba(15,23,42,0.05)] backdrop-blur">
          <span className="text-sm font-semibold text-slate-600">
            {t('text-comparing')}
          </span>
          {skus.map((sku) => (
            <button
              key={sku}
              type="button"
              onClick={() => removeSku(sku)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
            >
              {sku}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clear}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            {t('text-clear-all-comparison')}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
          {t('text-loading-comparison')}
        </div>
      ) : null}

      {queryError ? (
        <div className="flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <HiOutlineExclamationCircle className="h-5 w-5" />
          {queryError?.message || t('text-unable-load-comparison')}
        </div>
      ) : null}

      {!isLoading && !hasProducts ? (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-center">
          <p className="text-base font-semibold text-slate-800">
            {t('text-no-products-selected')}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {t('text-build-comparison-hint')
              .replace('<0>', '')
              .replace('</0>', '')}
          </p>
        </div>
      ) : null}

      {hasProducts ? (
        <ProductComparisonTable
          products={products}
          onRemove={removeSku}
          lang={lang}
        />
      ) : null}
    </Container>
  );
}
