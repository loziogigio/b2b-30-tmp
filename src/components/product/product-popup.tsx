'use client';

import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@utils/routes';
import Button from '@components/ui/button';
import ThumbnailCarousel from '@components/ui/carousel/thumbnail-carousel';
import Image from '@components/ui/image';
import {
  IoArrowRedoOutline,
  IoArrowForwardOutline,
  IoNotificationsOutline,
  IoNotifications,
} from 'react-icons/io5';
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
import CloseButton from '@components/ui/close-button';
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
  const { addSku: addSkuToCompare, hasSku } = useCompareList();
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

  const handleAddToCompare = () => {
    if (!sku) return;
    addSkuToCompare(sku);
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
    <div className="md:w-[600px] lg:w-[940px] xl:w-[1180px] 2xl:w-[1360px] mx-auto p-1 lg:p-0 xl:p-3 bg-brand-light rounded-md">
      <CloseButton onClick={closeModal} />

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
                    {t('text-view-product').toLowerCase()}
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
              <div
                className={cn(
                  'grid gap-2.5',
                  isAuthorized && isOutOfStock
                    ? 'grid-cols-4'
                    : isAuthorized
                      ? 'grid-cols-3'
                      : 'grid-cols-2',
                )}
              >
                {isAuthorized && isOutOfStock && (
                  <Button
                    variant="border"
                    onClick={handleToggleReminder}
                    loading={addToReminderLoader}
                    className={`group hover:text-yellow-500 ${hasReminder ? 'text-yellow-500' : ''}`}
                    title={
                      hasReminder
                        ? t('text-reminder-active')
                        : t('text-reminder-notify')
                    }
                  >
                    {hasReminder ? (
                      <IoNotifications className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all animate-pulse text-yellow-500" />
                    ) : (
                      <IoNotificationsOutline className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-yellow-500" />
                    )}
                    {t('text-reminder')}
                  </Button>
                )}

                {isAuthorized && (
                  <Button
                    variant="border"
                    onClick={async () => {
                      try {
                        setAddToWishlistLoader(true);
                        if (!sku) return;
                        await likes.toggle(sku);
                      } finally {
                        setAddToWishlistLoader(false);
                      }
                    }}
                    loading={addToWishlistLoader}
                    className={`group hover:text-brand ${favorite ? 'text-brand' : ''}`}
                    title={t('text-wishlist')}
                  >
                    {favorite ? (
                      <IoIosHeart className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all text-[#6D727F]" />
                    ) : (
                      <IoIosHeartEmpty className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all group-hover:text-brand" />
                    )}
                    {t('text-wishlist')}
                  </Button>
                )}

                <Button
                  variant="border"
                  className={cn(
                    'hover:text-emerald-600',
                    isInCompare
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : '',
                  )}
                  onClick={handleAddToCompare}
                  title="Confronta"
                  disabled={!sku}
                >
                  {isInCompare ? (
                    <HiOutlineCheckCircle className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 text-emerald-500" />
                  ) : (
                    <HiOutlineSwitchHorizontal className="text-2xl md:text-[26px] ltr:mr-2 rtl:ml-2 transition-all" />
                  )}
                  {isInCompare ? 'In compare' : 'Confronta'}
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
                    className={`absolute z-10 ltr:right-0 rtl:left-0 w-[300px] md:min-w-[400px] transition-all duration-300 ${
                      shareButtonStatus
                        ? 'visible opacity-100 top-full'
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
