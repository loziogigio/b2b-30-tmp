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
import { productPlaceholder } from '@assets/placeholders';

// NEW: ERP prices
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';

// NEW: AddToCart (server-aware)
import AddToCart from '@components/product/add-to-cart';
import { fetchErpPrices } from '@framework/erp/prices';
import { useLikes } from '@contexts/likes/likes.context';
import { useUI } from '@contexts/ui.context';
import PriceAndPromo from './price-and-promo';
import PackagingGrid from './packaging-grid';
import { da } from 'date-fns/locale';
import { formatAvailability } from '@utils/format-availability';

// add inside ProductB2BDetails.tsx (same file, above the component's return)

export function B2BInfoBlock({
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
            { availability > 0 && priceData  && (
              <>
                <dt className="text-gray-500">Disponiblita:</dt>
                <dd className="text-gray-700">{formatAvailability(
                  availability,
                  priceData.packaging_option_default?.packaging_uom
                )}</dd>
              </>
            )}

            {buyDid && buyDidLast && (
              <>
                <dt className="text-gray-500">Ultimo ordinato:</dt>
                <dd className="text-gray-700">{buyDidLast}</dd>
              </>
            )}
            {earliestDateDmy && availability <= 0 && (
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


type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
};

interface LightboxProps {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}

const ProductImageLightbox: React.FC<LightboxProps> = ({ images, index, onClose, onStep }) => {
  const [zoom, setZoom] = React.useState(1);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const total = images.length;
  const current = images[index];

  React.useEffect(() => {
    setZoom(1);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      scrollRef.current.scrollLeft = 0;
    }
  }, [index]);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!total) return;
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          onStep(1);
          break;
        case 'ArrowLeft':
          onStep(-1);
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.25, 4));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.25, 0.5));
          break;
        case '0':
          setZoom(1);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onStep, total]);

  if (!total || !current) return null;

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  return (
    <div
      className="fixed inset-0 z-[60] flex h-full w-full items-stretch justify-center bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Product gallery lightbox"
      onClick={onClose}
    >
      <div className="flex h-full w-full max-w-6xl flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{current.alt ?? 'Product image'} · {index + 1} / {total}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetZoom}
              className="rounded border border-white/30 px-3 py-1 text-xs uppercase tracking-wide transition hover:bg-white/20"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/30 px-3 py-1 text-xs uppercase tracking-wide transition hover:bg-white/20"
              aria-label="Close lightbox"
            >
              Close
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto px-4 pb-6">
          <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
            <div
              className="relative w-full max-w-[min(90vw,900px)] rounded-md bg-white"
              style={{ aspectRatio: '1 / 1' }}
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
                <Image
                  src={current.original}
                  alt={current.alt ?? 'Product image enlarged'}
                  fill
                  sizes="(min-width: 1024px) 70vw, 90vw"
                  className="object-contain select-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-5 text-sm">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded border border-white/30 px-3 py-1 transition hover:bg-white/20"
            aria-label="Zoom out"
          >
            Zoom −
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded border border-white/30 px-3 py-1 transition hover:bg-white/20"
            aria-label="Zoom in"
          >
            Zoom +
          </button>
          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onStep(-1)}
                className="rounded border border-white/30 px-3 py-1 transition hover:bg-white/20"
                aria-label="Previous image"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => onStep(1)}
                className="rounded border border-white/30 px-3 py-1 transition hover:bg-white/20"
                aria-label="Next image"
              >
                Next
              </button>
            </>
          ) : null}
          <span className="ml-2 text-xs text-white/70">Use mouse wheel, +/- keys, or buttons to zoom. ESC to close.</span>
        </div>
      </div>
    </div>
  );
};


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
  const data = Array.isArray(first?.variations) && first.variations.length > 0
    ? first.variations[0]
    : first;

  // ---- ERP prices (entity_codes must be string[]) ----
  const entityCodes = [String(data?.id ?? '')].filter(Boolean); // string[]
  const erpPayload = { ...ERP_STATIC, entity_codes: entityCodes };

  const { isAuthorized: isAuthForPrices } = useUI();
  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', entityCodes],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthForPrices && entityCodes.length > 0,
  });

  // pick the ERP price slice for this product (shape may vary by backend)
  const erpPrice: ErpPriceData | undefined = Array.isArray(erpPricesData)
    ? erpPricesData[0]
    : (erpPricesData as any)?.[entityCodes[0]];

  // Likes context
  const likes = useLikes();
  const { isAuthorized } = useUI();
  const sku = String(data?.sku ?? '');
  const favorite = isAuthorized && sku ? likes.isLiked(sku) : false;
  const [addToWishlistLoader, setAddToWishlistLoader] = useState(false);
  const [shareButtonStatus, setShareButtonStatus] = useState(false);

  const galleryItems = React.useMemo<GalleryImage[]>(() => {
    if (!data) return [];
    if (Array.isArray(data.gallery) && data.gallery.length > 0) {
      return data.gallery.map((item: any, index: number) => ({
        id: item.id ?? index,
        original: item.original ?? productPlaceholder,
        thumbnail: item.thumbnail ?? item.original ?? productPlaceholder,
        alt: item.alt ?? data.name ?? 'Product image',
      }));
    }

    const fallback = data.image?.original ?? data.image?.thumbnail ?? productPlaceholder;
    return [
      {
        id: data.id ?? 'primary',
        original: fallback,
        thumbnail: data.image?.thumbnail ?? fallback,
        alt: data.name ?? 'Product image',
      },
    ];
  }, [data]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = React.useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = React.useCallback(() => setLightboxIndex(null), []);

  const stepLightbox = React.useCallback(
    (delta: number) => {
      setLightboxIndex((prev) => {
        if (prev == null) return prev;
        const total = galleryItems.length;
        if (!total) return prev;
        const next = (prev + delta + total) % total;
        return next;
      });
    },
    [galleryItems.length]
  );

  const productUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}${ROUTES.PRODUCT}/${pathname.slug}`;

  // Ensure we know initial like status with a lightweight bulk check
  React.useEffect(() => {
    if (!sku) return;
    if (!favorite) {
      // If unknown/not liked locally, fetch status and merge store
      likes.loadBulkStatus([sku]).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  if (isLoading) return <p>Loading...</p>;
  if (!data) return null;

  const toggleShare = () => setShareButtonStatus((s) => !s);

  const addToWishlist = async () => {
    try {
      setAddToWishlistLoader(true);
      if (!sku) return;
      await likes.toggle(sku);
    } finally {
      setAddToWishlistLoader(false);
    }
  };

  return (
    <div className="pt-6 pb-2 md:pt-7">
      {lightboxIndex != null ? (
        <ProductImageLightbox
          images={galleryItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onStep={stepLightbox}
        />
      ) : null}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] 2xl:gap-10">
        {/* Gallery */}
        <div className="mb-6 overflow-visible md:mb-8 lg:mb-0">
          {galleryItems.length ? (
            <ThumbnailCarousel
              gallery={galleryItems}
              // Fill remaining horizontal space while keeping a perfect square
              // The inner slide already uses aspect-square; flex-1 makes it expand
              thumbnailClassName="flex-1 w-full"
              galleryClassName="xl:w-[120px] 2xl:w-[140px]"
              lang={lang}
              onImageClick={openLightbox}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="relative w-full rounded-md border border-border-base bg-white" style={{ aspectRatio: '1 / 1' }}>
                <Image
                  src={productPlaceholder}
                  alt={data?.name ?? 'Product'}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col bg-white/80 px-4 pb-6 pt-4 ">
          {/* Title + brand + short description */}
          <div className="pb-1">
            <div className="md:mb-2.5 block -mt-1.5">
              <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">
                {data.sku}
              </span>
              <h2 className="mt-2 text-lg font-semibold uppercase tracking-wide text-brand-dark md:text-xl xl:text-2xl">
                {data?.name}
              </h2>
            </div>
          </div>
          {/* Short description  */}
          <div className="mt-3 flex flex-col items-start justify-start gap-4 text-sm text-brand-dark">
            {/* Left: Short Description */}
            {data?.description ? (
              <p className="leading-relaxed text-gray-700">{data.description}</p>
            ) : null}
          </div>

          {/* === Box Info === */}

          <B2BInfoBlock product={data} priceData={erpPrice} lang={lang} />



          {/* === 3-up row: Packaging | Price | AddToCart === */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* col 1: packaging */}
            <div className="">
              <PackagingGrid pd={erpPrice} />
            </div>

            {/* col 2: price/promo (centered) */}
            <div className="flex items-center justify-center ">
              {erpPrice ? <PriceAndPromo priceData={erpPrice} /> : null}
            </div>

            {/* col 3: add to cart (right-aligned on md+) */}
            <div className="flex items-center justify-center  md:justify-end">
              {isAuthForPrices && (
                <AddToCart
                  lang={lang}
                  product={data}
                  priceData={erpPrice}
                  className="justify-center md:justify-end"
                  disabled={!erpPrice?.product_label_action?.ADD_TO_CART}
                />
              )}
            </div>
          </div>

          {/* Wishlist / Share */}
          <div className="pt-3 md:pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              {isAuthorized && (
              <Button
                variant="border"
                onClick={addToWishlist}
                loading={addToWishlistLoader}
                className={`group hover:text-brand ${favorite ? 'text-brand' : ''}`}
              >
                {favorite ? (
                  <IoIosHeart className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all text-red-500" />
                ) : (
                  <IoIosHeartEmpty className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                )}
                {t('text-wishlist')}
              </Button>
              )}

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

      <ProductB2BDetailsTab lang={lang} product={data} />
    </div>
  );
};

export default ProductB2BDetails;
