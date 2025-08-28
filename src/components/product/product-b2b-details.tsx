'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import useWindowSize from '@utils/use-window-size';
import { useProductListQuery } from '@framework/product/get-b2b-product';
import ThumbnailCarousel from '@components/ui/carousel/thumbnail-carousel';
import Image from '@components/ui/image';
import Button from '@components/ui/button';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import TagLabel from '@components/ui/tag-label';
import LabelIcon from '@components/icons/label-icon';
import { IoArrowRedoOutline } from 'react-icons/io5';
import SocialShareBox from '@components/ui/social-share-box';
import ProductB2BDetailsTab from '@components/product/product-details/product-b2b-tab';
import { useTranslation } from 'src/app/i18n/client';
import Link from 'next/link';

// NEW: ERP prices
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';

// NEW: AddToCart (server-aware)
import AddToCart from '@components/product/add-to-cart';
import { fetchErpPrices } from '@framework/erp/prices';
import PriceAndPromo from './price-and-promo';
import PackagingGrid from './packaging-grid';
import { da } from 'date-fns/locale';

// add inside ProductB2BDetails.tsx (same file, above the component's return)

function B2BInfoBlock({
  product,
  priceData,
  lang,
}: {
  product: any;
  priceData?: ErpPriceData;
  lang: string;
}) {
  // --- helpers
  type SupplierArrival = {
    expected_date?: string;          // YYYY-MM-DD or DD/MM/YYYY
    confirmed_date?: string;         // YYYY-MM-DD or DD/MM/YYYY
    DataArrivoPrevista?: string;     // fallback (raw)
    DataArrivoConfermata?: string;   // fallback (raw)
    NumeroDellaSettimana?: number;
  };

  const dmyToIso = (s?: string) => {
    if (!s) return undefined;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  };
  const isoToDmy = (s?: string) => {
    if (!s) return undefined;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };
  const parseDate = (s?: string) => {
    if (!s) return NaN;
    const iso = dmyToIso(s);
    const t = Date.parse(iso!);
    return Number.isNaN(t) ? NaN : t;
  };

  const arrivals: SupplierArrival[] =
    priceData?.product_label_action?.order_supplier_available ??
    (priceData as any)?.order_supplier_available ??
    (priceData as any)?.order_suplier_available ??
    [];

  const earliest = arrivals
    .map((a) => ({
      ...a,
      _chosen: a.expected_date ?? a.confirmed_date ?? a.DataArrivoPrevista ?? a.DataArrivoConfermata,
      _ts: parseDate(a.expected_date ?? a.confirmed_date ?? a.DataArrivoPrevista ?? a.DataArrivoConfermata),
    }))
    .filter((a) => Number.isFinite(a._ts))
    .sort((a, b) => a._ts - b._ts)[0];

  const earliestDateDmy = isoToDmy(earliest?._chosen);
  const earliestWeek = earliest?.NumeroDellaSettimana;

  // --- static/specs
  const model = product?.model ?? '—';
  const codiceProdotto = product?.sku ?? product?.id ?? '—';
  const codiceFigura = (product as any)?.figure_code ?? (product as any)?.fig_code ?? 'F84240';

  const availability = Number(priceData?.availability ?? 0);
  const buyDid = Boolean(priceData?.buy_did);
  const buyDidLast = priceData?.buy_did_last_date;

  const stato =
    priceData?.product_label_action?.LABEL ??
    (availability > 0 ? 'DISPONIBILE' : earliestDateDmy ? 'IN ARRIVO' : 'NON DISPONIBILE');

  const brandImg = product?.brand?.brand_image?.original;
  const brandName = product?.brand?.name || 'Brand';

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-white/60">
      <div className="grid grid-cols-5 items-start gap-4 p-4">
        {/* Left: specs */}
        <div className="col-span-4">
          <dl className="grid grid-cols-[140px,1fr] gap-y-2 text-[13px] sm:text-sm">
            <dt className="text-gray-500">MODELLO:</dt>
            <dd className="font-semibold text-gray-700 break-words">{model}</dd>

            <dt className="text-gray-500">Codice Prodotto:</dt>
            <dd className="text-gray-700">{codiceProdotto}</dd>

            <dt className="text-gray-500">Codice Figura:</dt>
            <dd className="text-gray-700">{codiceFigura}</dd>

            <dt className="text-gray-500">Stato:</dt>
            <dd
              className={
                availability > 0
                  ? 'font-semibold text-emerald-600'
                  : earliestDateDmy
                    ? 'font-semibold text-blue-700'
                    : 'font-semibold text-gray-600'
              }
            >
              {stato}
            </dd>

            {buyDid && buyDidLast && (
              <>
                <dt className="text-gray-500">Ultimo ordinato:</dt>
                <dd className="text-gray-700">{buyDidLast}</dd>
              </>
            )}
            {earliestDateDmy && availability !> 0 && (
              <>
                <dt className="text-gray-500">Arrivo Previsto:</dt>
                <dd className="font-semibold text-green-600">
                  {earliestDateDmy ?? '—'}
                  {earliestWeek ? <span className="ml-1 text-gray-700">(Settimana {earliestWeek})</span> : null}
                </dd>
              </>
            )}
          </dl>
        </div>

        {/* Right: brand logo */}
        <div className="col-span-1 flex justify-end">
          {brandImg ? (
            <Link
              href={`/${lang}/search?filters-id_brand=${product?.brand?.id ?? ''}`}
              className="flex justify-start sm:justify-end"
            >
              <img src={brandImg} alt={brandName} className="h-full w-full object-contain" />
            </Link>
          ) : (
            <div className="h-10 sm:h-12 w-24 rounded bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  );
}


const ProductB2BDetails: React.FC<{ lang: string; search: any }> = ({ lang, search }) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = useParams();
  const { width } = useWindowSize();

  // Load product from B2B list
  const { data: data_results, isLoading } = useProductListQuery({
    address_code: '',
    per_page: 12,
    start: 1,
    customer_code: '00000',
    search,
  });

  const first = data_results?.[0];
  const data = Array.isArray(first?.children_items) && first.children_items.length > 0
    ? first.children_items[0]
    : first;

  // ---- ERP prices (entity_codes must be string[]) ----
  const entityCodes = [String(data?.id ?? '')].filter(Boolean); // string[]
  const erpPayload = { ...ERP_STATIC, entity_codes: entityCodes };

  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', entityCodes],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: entityCodes.length > 0,
  });

  // pick the ERP price slice for this product (shape may vary by backend)
  const erpPrice: ErpPriceData | undefined = Array.isArray(erpPricesData)
    ? erpPricesData[0]
    : (erpPricesData as any)?.[entityCodes[0]];

  // UI state (wishlist/share only)
  const [favorite, setFavorite] = useState(false);
  const [addToWishlistLoader, setAddToWishlistLoader] = useState(false);
  const [shareButtonStatus, setShareButtonStatus] = useState(false);

  const productUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}${ROUTES.PRODUCT}/${pathname.slug}`;

  if (isLoading) return <p>Loading...</p>;
  if (!data) return null;

  const toggleShare = () => setShareButtonStatus((s) => !s);

  const addToWishlist = () => {
    setAddToWishlistLoader(true);
    const next = !favorite;
    setFavorite(next);
    setTimeout(() => setAddToWishlistLoader(false), 800);
  };

  return (
    <div className="pt-6 pb-2 md:pt-7">
      <div className="grid-cols-10 lg:grid gap-7 2xl:gap-8">
        {/* Gallery */}
        <div className="col-span-5 mb-6 overflow-hidden xl:col-span-6 md:mb-8 lg:mb-0">
          {!!data?.gallery?.length ? (
            <ThumbnailCarousel
              gallery={data.gallery}
              thumbnailClassName="xl:w-[700px] 2xl:w-[900px]"
              galleryClassName="xl:w-[150px] 2xl:w-[170px]"
              lang={lang}
            />
          ) : (
            <div className="flex items-center justify-center w-auto">
              <Image
                src={data?.image?.original ?? '/product-placeholder.svg'}
                alt={data?.name!}
                width={900}
                height={680}
                style={{ width: 'auto' }}
              />
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col col-span-5 shrink-0 xl:col-span-4 xl:ltr:pl-2 xl:rtl:pr-2">
          {/* Title + brand + short description */}
          <div className="pb-1">
            <div className="md:mb-2.5 block -mt-1.5">
              <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">
                {data.sku}
              </span>
              <h2 className="text-lg font-medium transition-colors duration-300 text-brand-dark md:text-xl xl:text-2xl">
                {data?.name}
              </h2>
            </div>
          </div>
          {/* Short description  */}
          <div className="flex flex-col sm:flex-row justify-start items-start mt-2 gap-4">
            {/* Left: Short Description */}
            <div className="text-sm text-brand-dark">
              {data?.description && (
                data.description
              )}
            </div>
          </div>

          {/* === Box Info === */}

          <B2BInfoBlock product={data} priceData={erpPrice} lang={lang} />



          {/* === 3-up row: Packaging | Price | AddToCart === */}
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            {/* col 1: packaging */}
            <div>
              <PackagingGrid pd={erpPrice} />
            </div>

            {/* col 2: price/promo (centered) */}
            <div className="flex items-center justify-center">
              {erpPrice ? <PriceAndPromo priceData={erpPrice} /> : null}
            </div>

            {/* col 3: add to cart (right-aligned on md+) */}
            <div className="flex items-center justify-center md:justify-end">
              <AddToCart lang={lang} product={data} priceData={erpPrice} className='justify-center md:justify-end' disabled={!erpPrice?.product_label_action?.ADD_TO_CART} />
            </div>
          </div>

          {/* Wishlist / Share */}
          <div className="pt-3 md:pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="border"
                onClick={addToWishlist}
                loading={addToWishlistLoader}
                className={`group hover:text-brand ${favorite ? 'text-brand' : ''}`}
              >
                {favorite ? (
                  <IoIosHeart className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all" />
                ) : (
                  <IoIosHeartEmpty className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                )}
                {t('text-wishlist')}
              </Button>

              <div className="relative group">
                <Button
                  variant="border"
                  className={`w-full hover:text-brand ${shareButtonStatus ? 'text-brand' : ''}`}
                  onClick={toggleShare}
                >
                  <IoArrowRedoOutline className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                  {t('text-share')}
                </Button>
                <SocialShareBox
                  className={`absolute z-10 ltr:right-0 rtl:left-0 w-[300px] md:min-w-[400px] transition-all duration-300 ${shareButtonStatus ? 'visible opacity-100 top-full' : 'opacity-0 invisible top-[130%]'
                    }`}
                  shareUrl={productUrl}
                  lang={lang}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductB2BDetailsTab lang={lang} />
    </div>
  );
};

export default ProductB2BDetails;