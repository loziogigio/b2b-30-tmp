'use client';

import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import ThumbnailCarousel from '@components/ui/carousel/thumbnail-carousel';
import Image from '@components/ui/image';
import { IoArrowRedoOutline, IoArrowForwardOutline } from 'react-icons/io5';
import { ReminderIcon, ReminderIconFilled } from '@components/icons/app-icons';
import {
  HiOutlineSwitchHorizontal,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import SocialShareBox from '@components/ui/social-share-box';
import { IoIosHeart, IoIosHeartEmpty } from 'react-icons/io';
import {
  useModalAction,
  useModalState,
} from '@components/common/modal/modal.context';
import { IoClose } from 'react-icons/io5';
import { useTranslation } from 'src/app/i18n/client';

// ERP prices
import { useQuery } from '@tanstack/react-query';
import { ERP_STATIC } from '@framework/utils/static';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { fetchErpPrices } from '@framework/erp/prices';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useUI } from '@contexts/ui.context';

// B2B bits
import PackagingGrid from './packaging-grid';
import PriceAndPromo from './price-and-promo';
import AddToCart from './add-to-cart';
import B2BInfoBlock from './details/b2b-info-block';
import { useCompareList } from '@/contexts/compare/compare.context';

export default function ProductPopup({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data: product } = useModalState() as { data: any };
  const { closeModal, closeAll } = useModalAction();
  const router = useRouter();

  // Likes context
  const likes = useLikes();
  const reminders = useReminders();
  const { isAuthorized } = useUI();
  const sku = String(product?.sku ?? '');
  const {
    addSku: addSkuToCompare,
    removeSku: removeSkuFromCompare,
    hasSku,
  } = useCompareList();
  const favorite = isAuthorized && sku ? likes.isLiked(sku) : false;
  const hasReminder = isAuthorized && sku ? reminders.hasReminder(sku) : false;
  // --- Wishlist / share UI only ---
  const [addToWishlistLoader, setAddToWishlistLoader] = useState(false);
  const [addToReminderLoader, setAddToReminderLoader] = useState(false);
  const [shareButtonStatus, setShareButtonStatus] = useState(false);
  const toggleShare = () => setShareButtonStatus((s) => !s);

  // --- ERP prices for this product ---
  const entityCodes = [String(product?.id ?? '')].filter(Boolean); // string[]
  const erpPayload = { ...ERP_STATIC, entity_codes: entityCodes };

  const { data: erpPricesData } = useQuery({
    queryKey: ['erp-prices', entityCodes],
    queryFn: () => fetchErpPrices(erpPayload),
    enabled: isAuthorized && entityCodes.length > 0,
  });

  const erpPrice: ErpPriceData | undefined = Array.isArray(erpPricesData)
    ? erpPricesData[0]
    : (erpPricesData as any)?.[entityCodes[0]];

  const productUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${lang}${ROUTES.PRODUCT}?sku=${encodeURIComponent(product?.sku ?? '')}`;
  const isInCompare = hasSku(sku);

  const handleToggleCompare = () => {
    if (!sku) return;
    if (hasSku(sku)) {
      removeSkuFromCompare(sku);
    } else {
      addSkuToCompare(sku);
    }
  };

  function navigateToProductPage() {
    // Close entire modal stack (ProductPopup + any parent like Variants Quick View)
    closeAll();
    router.push(
      `/${lang}${ROUTES.PRODUCT}?sku=${encodeURIComponent(product?.sku ?? '')}`,
    );
  }

  // Ensure we know initial like status with a lightweight bulk check
  useEffect(() => {
    if (!sku) return;
    if (!favorite) {
      likes.loadBulkStatus([sku]).catch(() => {});
    }
    if (isAuthorized && !hasReminder) {
      reminders.loadBulkStatus([sku]).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  if (!product) return null;

  const canAdd = erpPrice?.product_label_action?.ADD_TO_CART ?? true;
  const isOutOfStock = erpPrice ? Number(erpPrice.availability) <= 0 : false;

  // Check if we have a valid price
  const anyPD = erpPrice as any;
  const price =
    anyPD?.price_discount ??
    anyPD?.net_price ??
    anyPD?.gross_price ??
    anyPD?.price_gross;
  const hasValidPrice = erpPrice && price != null && Number(price) > 0;

  const handleToggleReminder = async () => {
    try {
      setAddToReminderLoader(true);
      if (!sku) return;
      await reminders.toggle(sku);
    } finally {
      setAddToReminderLoader(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto mx-auto p-3 sm:p-4 lg:p-6 bg-brand-light relative">
      {/* Close button */}
      <button
        onClick={closeModal}
        aria-label="Close"
        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 shadow-sm transition-colors"
      >
        <IoClose className="text-2xl" />
      </button>

      <div className="pt-6 pb-2 md:pt-7">
        <div className="grid-cols-10 lg:grid gap-7 2xl:gap-8">
          {/* Gallery */}
          <div className="col-span-5 mb-6 overflow-hidden xl:col-span-4 md:mb-8 lg:mb-0">
            {Array.isArray(product?.gallery) && product.gallery.length > 0 ? (
              <ThumbnailCarousel
                gallery={product.gallery}
                thumbnailClassName="xl:w-[700px] 2xl:w-[900px]"
                galleryClassName="xl:w-[150px] 2xl:w-[170px]"
                lang={lang}
              />
            ) : (
              <div className="flex items-center justify-center w-auto">
                <Image
                  src={product?.image?.original || '/product-placeholder.svg'}
                  alt={product?.name ?? 'Product'}
                  width={900}
                  height={680}
                  style={{ width: 'auto' }}
                />
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col col-span-5 shrink-0 xl:col-span-6 xl:ltr:pl-2 xl:rtl:pr-2">
            {/* Title + SKU + View Product Link */}
            <div className="pb-1">
              <div className="md:mb-2.5 -mt-1.5">
                <div className="flex items-center justify-between pr-8">
                  {product?.sku ? (
                    <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">
                      {product.sku}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={navigateToProductPage}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-brand text-brand-light text-sm font-medium transition-all hover:bg-brand/90"
                  >
                    {t('text-view-full-product', { defaultValue: 'vedi scheda completa' })}
                    <IoArrowForwardOutline className="ml-2 text-base" />
                  </button>
                </div>
                <h2
                  className="mt-2 text-lg font-medium transition-colors duration-300 text-brand-dark md:text-xl xl:text-2xl cursor-pointer"
                  onClick={navigateToProductPage}
                  title={product?.name}
                >
                  {product?.name}
                </h2>
              </div>
            </div>

            {/* Short description */}
            {product?.description ? (
              <div className="mt-2 text-sm text-brand-dark">
                {product.description}
              </div>
            ) : null}

            {/* Info block (status/ETA/brand) */}
            <B2BInfoBlock product={product} priceData={erpPrice} lang={lang} />

            {/* 3-up row: Packaging | Price | AddToCart - only show when we have valid price */}
            {hasValidPrice && (
              <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-3">
                <div>
                  <PackagingGrid pd={erpPrice} />
                </div>

                <div className="flex items-center justify-center">
                  <PriceAndPromo priceData={erpPrice} />
                </div>

                <div className="flex items-center justify-center md:justify-end">
                  <AddToCart
                    lang={lang}
                    product={product}
                    priceData={erpPrice}
                    className="justify-center md:justify-end"
                    disabled={!canAdd}
                  />
                </div>
              </div>
            )}

            {/* Wishlist / Reminder / Compare / Share */}
            <div className="pt-3 md:pt-4">
              <div className="flex items-start justify-start gap-4">
                {/* Reminder Button - only show when out of stock */}
                {isAuthorized && isOutOfStock && (
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={handleToggleReminder}
                      disabled={addToReminderLoader}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                        hasReminder
                          ? 'border-yellow-300 bg-yellow-50 text-yellow-500'
                          : 'border-slate-200 text-slate-600 hover:border-yellow-300 hover:text-yellow-500',
                      )}
                    >
                      {hasReminder ? (
                        <ReminderIconFilled className="h-5 w-5 animate-pulse" />
                      ) : (
                        <ReminderIcon className="h-5 w-5" />
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
                      onClick={async () => {
                        try {
                          setAddToWishlistLoader(true);
                          if (!sku) return;
                          await likes.toggle(sku);
                        } finally {
                          setAddToWishlistLoader(false);
                        }
                      }}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
