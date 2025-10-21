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
import B2BInfoBlock from './details/b2b-info-block';
import ProductImageLightbox from './details/product-image-lightbox';

// add inside ProductB2BDetails.tsx (same file, above the component's return)

// OldB2BInfoBlock removed (extracted to ./details/b2b-info-block)


// GalleryImage type retained for local typing in this file
type GalleryImage = {
  id?: string | number;
  original: string;
  thumbnail?: string;
  alt?: string;
};


import type { PageBlock } from '@/lib/types/blocks';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

const ProductB2BDetails: React.FC<{ lang: string; search: any; blocks?: PageBlock[]; showZoneLabels?: boolean }> = ({ lang, search, blocks = [], showZoneLabels = false }) => {
  const { t } = useTranslation(lang, 'common');
  const pathname = useParams();
  const { width } = useWindowSize();

  // Filter blocks by zone
  const zone1Blocks = blocks.filter(b => b.zone === 'zone1');
  const zone2Blocks = blocks.filter(b => b.zone === 'zone2');
  const zone3Blocks = blocks.filter(b => b.zone === 'zone3');
  const zone4Blocks = blocks.filter(b => b.zone === 'zone4');

  // Zone label component for preview mode
  const ZoneLabel = ({ zone, color, label }: { zone: string; color: string; label: string }) => {
    if (!showZoneLabels) return null;
    return (
      <div className={`mb-2 flex items-center gap-2 rounded-md border-2 border-dashed border-${color}-300 bg-${color}-50/50 px-3 py-2`}>
        <div className={`h-2 w-2 rounded-full bg-${color}-500`}></div>
        <span className={`text-xs font-bold text-${color}-700`}>{label}</span>
      </div>
    );
  };

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
      <ProductB2BDetailsTab lang={lang} product={data} zone3Blocks={zone3Blocks} />

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
    </div>
  );
};

export default ProductB2BDetails;
