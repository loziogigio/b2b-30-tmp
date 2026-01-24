'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import useWindowSize from '@utils/use-window-size';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import ThumbnailCarousel from '@components/ui/carousel/thumbnail-carousel';
import Image from '@components/ui/image';
import Button from '@components/ui/button';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import {
  IoNotificationsOutline,
  IoNotifications,
  IoArrowRedoOutline,
} from 'react-icons/io5';
import {
  HiOutlineSwitchHorizontal,
  HiOutlineCheckCircle,
  HiOutlinePrinter,
} from 'react-icons/hi';
import TagLabel from '@components/ui/tag-label';
import LabelIcon from '@components/icons/label-icon';
import SocialShareBox from '@components/ui/social-share-box';
import ProductB2BDetailsTab from '@components/product/product-details/product-b2b-tab';
import { useTranslation } from 'src/app/i18n/client';
import Link from 'next/link';
import { productPlaceholder } from '@assets/placeholders';
import cn from 'classnames';

// NEW: ERP prices
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';

// NEW: AddToCart (server-aware)
import AddToCart from '@components/product/add-to-cart';
import { fetchErpPrices } from '@framework/erp/prices';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';
import PriceAndPromo from './price-and-promo';
import PackagingGrid from './packaging-grid';
import { da } from 'date-fns/locale';
import { formatAvailability } from '@utils/format-availability';
import B2BInfoBlock from './details/b2b-info-block';
import ProductImageLightbox from './details/product-image-lightbox';
import { useCompareList } from '@/contexts/compare/compare.context';
import { printProductDetail } from '@utils/print-product';
import CorrelatedProductsCarousel from './feeds/correlated-products-carousel';
import ProductJsonLd from '@components/seo/product-json-ld';

// add inside ProductB2BDetails.tsx (same file, above the component's return)

// OldB2BInfoBlock removed (extracted to ./details/b2b-info-block)

// GalleryImage type retained for local typing in this file
type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
  mediaType?: 'image' | 'video' | '3d-model';
  videoUrl?: string;
  modelUrl?: string;
  label?: string;
};

import type { PageBlock } from '@/lib/types/blocks';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

const ProductB2BDetails: React.FC<{
  lang: string;
  search: any;
  blocks?: PageBlock[];
  showZoneLabels?: boolean;
}> = ({ lang, search, blocks = [], showZoneLabels = false }) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = useParams();
  const { width } = useWindowSize();

  // Filter blocks by zone
  const zone1Blocks = blocks.filter((b) => b.zone === 'zone1');
  const zone2Blocks = blocks.filter((b) => b.zone === 'zone2');
  const zone3Blocks = blocks.filter((b) => b.zone === 'zone3');
  const zone4Blocks = blocks.filter((b) => b.zone === 'zone4');

  // Zone label component for preview mode
  const ZoneLabel = ({
    zone,
    color,
    label,
  }: {
    zone: string;
    color: string;
    label: string;
  }) => {
    if (!showZoneLabels) return null;
    return (
      <div
        className={`mb-2 flex items-center gap-2 rounded-md border-2 border-dashed border-${color}-300 bg-${color}-50/50 px-3 py-2`}
      >
        <div className={`h-2 w-2 rounded-full bg-${color}-500`}></div>
        <span className={`text-xs font-bold text-${color}-700`}>{label}</span>
      </div>
    );
  };

  // Load product from PIM
  const skuToSearch = search?.sku ? [search.sku] : [];
  const { data: pimResults = [], isLoading } = usePimProductListQuery(
    {
      limit: 1,
      filters: {
        sku: skuToSearch,
      },
    },
    { enabled: skuToSearch.length > 0 },
  );

  const first = pimResults?.[0];
  const data =
    Array.isArray(first?.variations) && first.variations.length > 0
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
  const reminders = useReminders();
  const { isAuthorized } = useUI();
  const sku = String(data?.sku ?? '');
  const {
    addSku: addSkuToCompare,
    removeSku: removeSkuFromCompare,
    hasSku,
  } = useCompareList();
  const favorite = isAuthorized && sku ? likes.isLiked(sku) : false;
  const hasReminder = isAuthorized && sku ? reminders.hasReminder(sku) : false;
  const [addToWishlistLoader, setAddToWishlistLoader] = useState(false);
  const [addToReminderLoader, setAddToReminderLoader] = useState(false);
  const [shareButtonStatus, setShareButtonStatus] = useState(false);

  // Check if product is out of stock
  const isOutOfStock = erpPrice ? Number(erpPrice.availability) <= 0 : false;

  // Check if we have a valid price
  const anyPD = erpPrice as any;
  const price =
    anyPD?.price_discount ??
    anyPD?.net_price ??
    anyPD?.gross_price ??
    anyPD?.price_gross;
  const hasValidPrice = erpPrice && price != null && Number(price) > 0;

  const galleryItems = React.useMemo<GalleryImage[]>(() => {
    if (!data) return [];

    const items: GalleryImage[] = [];

    // Add product images
    if (Array.isArray(data.gallery) && data.gallery.length > 0) {
      data.gallery.forEach((item: any, index: number) => {
        items.push({
          id: item.id ?? `img-${index}`,
          original: item.original ?? productPlaceholder,
          thumbnail: item.thumbnail ?? item.original ?? productPlaceholder,
          alt: item.alt ?? data.name ?? 'Product image',
          mediaType: 'image',
        });
      });
    } else {
      // Fallback to main image
      const fallback =
        data.image?.original ?? data.image?.thumbnail ?? productPlaceholder;
      items.push({
        id: data.id ?? 'primary',
        original: fallback,
        thumbnail: data.image?.thumbnail ?? fallback,
        alt: data.name ?? 'Product image',
        mediaType: 'image',
      });
    }

    // Add videos and 3D models from media array
    const media = (data as any).media;
    if (Array.isArray(media)) {
      media.forEach((m: any, index: number) => {
        if (m.type === 'video') {
          // Extract YouTube thumbnail if it's a YouTube video
          let thumbnail = productPlaceholder;
          if (m.url?.includes('youtube.com') || m.url?.includes('youtu.be')) {
            const videoId = m.url.match(
              /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/,
            )?.[1];
            if (videoId) {
              thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
          }
          items.push({
            id: `video-${index}`,
            original: thumbnail,
            thumbnail: thumbnail,
            alt: m.label || 'Video',
            mediaType: 'video',
            videoUrl: m.url,
            label: m.label,
          });
        } else if (m.type === '3d-model') {
          items.push({
            id: `3d-${index}`,
            original: productPlaceholder,
            thumbnail: productPlaceholder,
            alt: m.label || '3D Model',
            mediaType: '3d-model',
            modelUrl: m.url,
            label: m.label,
          });
        }
      });
    }

    return items;
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
    [galleryItems.length],
  );

  const productUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${lang}${ROUTES.PRODUCT}?sku=${encodeURIComponent(sku)}`;
  const isInCompare = hasSku(sku);

  const handleToggleCompare = React.useCallback(() => {
    if (!sku) return;
    if (hasSku(sku)) {
      removeSkuFromCompare(sku);
    } else {
      addSkuToCompare(sku);
    }
  }, [sku, hasSku, addSkuToCompare, removeSkuFromCompare]);

  const handlePrint = React.useCallback(() => {
    if (!data) return;
    printProductDetail(data, erpPrice);
  }, [data, erpPrice]);

  // Ensure we know initial like/reminder status with a lightweight bulk check
  React.useEffect(() => {
    if (!sku) return;
    if (!favorite) {
      // If unknown/not liked locally, fetch status and merge store
      likes.loadBulkStatus([sku]).catch(() => {});
    }
    if (!hasReminder) {
      reminders.loadBulkStatus([sku]).catch(() => {});
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

  const toggleReminder = async () => {
    try {
      setAddToReminderLoader(true);
      if (!sku) return;
      await reminders.toggle(sku);
    } finally {
      setAddToReminderLoader(false);
    }
  };

  return (
    <div className="pt-6 pb-2 md:pt-7">
      {/* JSON-LD Structured Data for SEO */}
      <ProductJsonLd product={data} priceData={erpPrice} lang={lang} />

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
              enableMagnifier={true}
              activationMode="hover"
              magnifierZoom={2.6}
              magnifierPanelWidth={620}
              showMagnifierPanel
              lang={lang}
              onImageClick={openLightbox}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="relative w-full rounded-md border border-border-base bg-white"
                style={{ aspectRatio: '1 / 1' }}
              >
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
              <h2 className="mt-2 text-lg font-semibold tracking-wide text-brand-dark md:text-xl xl:text-2xl">
                {data?.name}
              </h2>
            </div>
          </div>
          {/* Short description  */}
          <div className="mt-3 flex flex-col items-start justify-start gap-4 text-sm text-brand-dark">
            {/* Left: Short Description */}
            {data?.description ? (
              <p className="leading-relaxed text-gray-700">
                {data.description}
              </p>
            ) : null}
          </div>

          {/* === Box Info === */}

          <B2BInfoBlock product={data} priceData={erpPrice} lang={lang} />

          {/* === 3-up row: Packaging | Price | AddToCart - only show when we have valid price === */}
          {hasValidPrice && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* col 1: packaging */}
              <div className="">
                <PackagingGrid pd={erpPrice} />
              </div>

              {/* col 2: price/promo (centered) */}
              <div className="flex items-center justify-center ">
                <PriceAndPromo priceData={erpPrice} />
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
          )}

          {/* Wishlist / Reminder / Compare / Share / Print */}
          <div className="pt-3 md:pt-4">
            <div
              className={`flex items-start justify-start gap-4 ${
                isAuthorized ? '' : ''
              }`}
            >
              {/* Reminder Button - only show when out of stock */}
              {isOutOfStock && isAuthorized && (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={toggleReminder}
                    disabled={addToReminderLoader}
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                      hasReminder
                        ? 'border-yellow-300 bg-yellow-50 text-yellow-500'
                        : 'border-slate-200 text-slate-600 hover:border-yellow-300 hover:text-yellow-500',
                    )}
                  >
                    {hasReminder ? (
                      <IoNotifications className="h-5 w-5 animate-pulse" />
                    ) : (
                      <IoNotificationsOutline className="h-5 w-5" />
                    )}
                  </button>
                  <span className="hidden sm:block mt-1 text-[10px] text-slate-500 text-center whitespace-nowrap">
                    {hasReminder
                      ? t('text-reminder-active')
                      : t('text-reminder')}
                  </span>
                </div>
              )}

              {/* Wishlist Button */}
              {isAuthorized && (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={addToWishlist}
                    disabled={addToWishlistLoader}
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                      favorite
                        ? 'border-brand/30 bg-brand/5 text-brand'
                        : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand',
                    )}
                  >
                    {favorite ? (
                      <IoIosHeart className="h-5 w-5" />
                    ) : (
                      <IoIosHeartEmpty className="h-5 w-5" />
                    )}
                  </button>
                  <span className="hidden sm:block mt-1 text-[10px] text-slate-500 text-center whitespace-nowrap">
                    {favorite ? t('text-favorited') : t('text-wishlist')}
                  </span>
                </div>
              )}

              {/* Compare Button */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleToggleCompare}
                  disabled={!sku}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                    isInCompare
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600',
                  )}
                >
                  {isInCompare ? (
                    <HiOutlineCheckCircle className="h-5 w-5" />
                  ) : (
                    <HiOutlineSwitchHorizontal className="h-5 w-5" />
                  )}
                </button>
                <span className="hidden sm:block mt-1 text-[10px] text-slate-500 text-center whitespace-nowrap">
                  {isInCompare ? t('text-in-compare') : t('text-compare')}
                </span>
              </div>

              {/* Share Button */}
              <div className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={toggleShare}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                    shareButtonStatus
                      ? 'border-brand/30 bg-brand/5 text-brand'
                      : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand',
                  )}
                >
                  <IoArrowRedoOutline className="h-5 w-5" />
                </button>
                <span className="hidden sm:block mt-1 text-[10px] text-slate-500 text-center whitespace-nowrap">
                  {t('text-share')}
                </span>
                <SocialShareBox
                  className={`absolute z-10 ltr:right-0 rtl:left-0 w-[300px] md:min-w-[400px] transition-all duration-300 ${
                    shareButtonStatus
                      ? 'visible opacity-100 top-full mt-2'
                      : 'opacity-0 invisible top-[130%]'
                  }`}
                  shareUrl={productUrl}
                  lang={lang}
                />
              </div>

              {/* Print Button */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600"
                >
                  <HiOutlinePrinter className="h-5 w-5" />
                </button>
                <span className="hidden sm:block mt-1 text-[10px] text-slate-500 text-center whitespace-nowrap">
                  {t('text-print')}
                </span>
              </div>
            </div>
          </div>

          {/* Zone 1: Sidebar blocks (below wishlist/share) */}
          {zone1Blocks.length > 0 && (
            <div className="pt-4 space-y-4">
              <ZoneLabel zone="zone1" color="blue" label="Sidebar" />
              {zone1Blocks.map((block, index) => (
                <BlockRenderer
                  key={block.id || `zone1-${index}`}
                  block={block}
                  productData={{ sku: String(data?.sku ?? ''), lang }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: After gallery (full width) */}
      {zone2Blocks.length > 0 && (
        <div className="pt-6 space-y-4">
          <ZoneLabel zone="zone2" color="green" label="After Gallery" />
          {zone2Blocks.map((block, index) => (
            <BlockRenderer
              key={block.id || `zone2-${index}`}
              block={block}
              productData={{ sku: String(data?.sku ?? ''), lang }}
            />
          ))}
        </div>
      )}

      {showZoneLabels && zone3Blocks.length > 0 && (
        <div className="pt-6">
          <ZoneLabel zone="zone3" color="purple" label="New Tab" />
        </div>
      )}
      <ProductB2BDetailsTab
        lang={lang}
        product={data}
        zone3Blocks={zone3Blocks}
      />

      {/* Zone 4: Below tabs (full width) */}
      {zone4Blocks.length > 0 && (
        <div className="pt-6 space-y-4">
          <ZoneLabel zone="zone4" color="orange" label="Bottom Section" />
          {zone4Blocks.map((block, index) => (
            <BlockRenderer
              key={block.id || `zone4-${index}`}
              block={block}
              productData={{ sku: String(data?.sku ?? ''), lang }}
            />
          ))}
        </div>
      )}

      {/* Related Products (Correlations) */}
      {data?.id && (
        <div className="pt-8">
          <CorrelatedProductsCarousel
            lang={lang}
            entityCode={String(data.id)}
            limit={12}
          />
        </div>
      )}
    </div>
  );
};

export default ProductB2BDetails;
