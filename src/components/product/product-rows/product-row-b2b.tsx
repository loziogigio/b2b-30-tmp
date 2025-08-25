'use client';

import { useState, useMemo } from 'react';
import cn from 'classnames';
import Image from '@components/ui/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslation } from 'src/app/i18n/client';
import { useModalAction } from '@components/common/modal/modal.context';
import { Product } from '@framework/types';
import { productPlaceholder } from '@assets/placeholders';
import { ErpPriceData } from '@utils/transform/erp-prices';
import PackagingGrid from '../packaging-grid';
import { formatAvailability } from '@utils/format-availability';
import PriceAndPromo from '../price-and-promo';

const AddToCart = dynamic(() => import('@components/product/add-to-cart'), { ssr: false });

type GetPrice = (id: string | number) => ErpPriceData | undefined;

interface Props {
  lang: string;
  product: Product;                  // parent (or flattened single-variation)
  getPrice: GetPrice;
  priceData?: ErpPriceData;          // parent price (or single-variation)
  className?: string;
}

// Parent row: 3 columns (image | info | brand)
const GRID_PARENT_3 =
  'grid grid-cols-1 sm:grid-cols-[110px_1fr_128px] gap-3 sm:gap-4 items-start';


/** 6 fixed columns (image | info | packaging | ordered | price | add) */
const GRID =
  'grid grid-cols-1 sm:grid-cols-[110px_1.35fr_1.1fr_0.7fr_0.95fr_0.8fr] gap-3 sm:gap-4 items-stretch';

/** vertical dividers between columns on ≥sm */
const GRID_COL_DIVIDERS =
  'sm:[&>*]:border-gray-200 sm:[&>*:last-child]:border-r-0';

const PARENT_IMG = 110;                 // px
const VARIANT_IMG = Math.round((PARENT_IMG * 2) / 3); // 73–74 px

const Cell = ({ className, children }: any) => (
  <div className={cn('min-w-0 self-center', className)}>{children}</div>
);

const Dash = () => <span className="text-gray-300">—</span>;


export default function ProductRowB2B({
  lang,
  product,
  getPrice,
  priceData,
  className,
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const { openModal } = useModalAction();

  const {
    name,
    image,
    sku,
    parent_sku,
    brand,
    description,
    variations = [],
  } = product ?? {};

  const parentSku = parent_sku;
  const isVariable = (variations?.length ?? 0) > 1;

  const singleVar = variations?.length === 1 ? variations[0] : null;

  // update this helper so it can accept a specific item (variant)
  const openQuick = (item?: Product) => {
    const payload = item ?? (singleVar ?? product);
    const modal = item ? 'PRODUCT_VIEW' : (isVariable ? 'B2B_PRODUCT_VARIANTS_QUICK_VIEW' : 'PRODUCT_VIEW');
    openModal(modal, payload);
  };


  /** Se non ci sono varianti, mostriamo comunque una “riga variante”
   * senza immagine e con i dati del parent. Se c’è una sola variante,
   * mostriamo direttamente la riga (senza toggle).
   */
  const variantRows: Array<any> = useMemo(() => {
    if ((variations?.length ?? 0) > 0) return variations;
    return [
      {
        ...product,
        __pseudo: true,
      },
    ];
  }, [variations, product]);

  const hasMultiple = (variations?.length ?? 0) > 1;
  const shouldShowRows = hasMultiple ? undefined : true; // se <=1, mostriamo sempre

  const [showVars, setShowVars] = useState<boolean>(shouldShowRows ?? false);

  /** ---------- RIGA PARENT (stesso grid) ---------- */
  return (
    <div className={cn('border border-gray-200 rounded-md bg-white', className)}>
      <div className="p-2 sm:p-3">
        <div className={cn(GRID_PARENT_3, GRID_COL_DIVIDERS, 'items-start')}>
          {/* 1) Parent image */}
          <Cell>
            <button
              type="button"
              onClick={() => openQuick()}
              className="relative block w-[96px] h-[96px] sm:w-[110px] sm:h-[110px] overflow-hidden rounded-md ring-1 ring-gray-100 mx-auto sm:mx-0"
              title={name ?? parentSku ?? 'Product'}
            >
              <Image
                src={image?.thumbnail && image.thumbnail.trim() !== ''
                  ? image.thumbnail
                  : productPlaceholder}
                alt={name ?? parentSku ?? 'Product'}
                fill
                sizes="140px"
                className="object-cover"
              />

            </button>
          </Cell>

          {/* 2) Parent info (name / parentSku / description) */}
          <Cell>
            <div className="min-w-0">
              {parentSku && (
                <div
                  className="mt-0.5 text-[11px] sm:text-xs text-gray-600 uppercase truncate"
                  title={parentSku}
                >
                  <span className="text-[10px] md:text-xs font-bold text-white uppercase bg-brand px-2 py-2">{parentSku}</span>

                </div>
              )}
              <h3
                className="text-sm sm:text-[15px] font-semibold text-gray-900 truncate uppercase"
                title={name ?? parentSku ?? ''}
              >
                {name ?? parentSku ?? <Dash />}
              </h3>



              {description ? (
                <p className="mt-1 text-xs sm:text-sm text-gray-700 line-clamp-2">
                  {description}
                </p>
              ) : (
                <div className="mt-1 text-xs text-gray-400"><Dash /></div>
              )}
            </div>
          </Cell>

          {/* 3) Brand image (right) */}
          <Cell className="hidden sm:flex justify-end items-center">
            {brand?.brand_image?.original && brand?.id && (
              <Link
                href={`/${lang}/search?filters-id_brand=${brand.id}`}
                className="block w-[120px] h-[64px]"
                title={brand?.name || 'Brand'}
              >
                <img
                  src={brand.brand_image.original}
                  alt={brand?.name || 'Brand'}
                  className="w-full h-full object-contain"
                />
              </Link>
            )}
          </Cell>
        </div>
      </div>


      {/* Toggle varianti (solo se > 1) */}
      {hasMultiple && (
        <div className="px-2 sm:px-2 pb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowVars(v => !v)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showVars
              ? t('hide-variants', { defaultValue: 'Hide variants' })
              : t('show-variants', { defaultValue: 'Show variants' })}{' '}
            ({variations.length})
          </button>
        </div>
      )}

      {/* ---------- SEZIONE VARIANTI (tabellare e omogenea) ---------- */}
      {(showVars || shouldShowRows) && (
        <div className="pl-2 sm:pl-3 pb-2 pr-2 divide-y-2 divide-gray-200">
          {variantRows.map((v) => {
            const isPseudo = !!(v as any).__pseudo;
            const vPrice: ErpPriceData | undefined = isPseudo ? priceData : getPrice(v.id);
            const vImg = v.image?.thumbnail ?? productPlaceholder;

            return (
              <div key={v.id} className={cn(
                'group relative transition-colors',
                'hover:bg-gray-100 mb-2 sm:mb-0 '
              )}>
                {/* Stesse 5 colonne + divisori verticali per “effetto tabella” */}
                <div className={cn(GRID, GRID_COL_DIVIDERS)}>
                  {/* 1) Immagine variante — align to right */}
                  <Cell className="!px-0 sm:justify-self-end justify-self-start">
                    {isPseudo ? (
                      <div aria-hidden style={{ width: VARIANT_IMG, height: VARIANT_IMG }} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => openQuick(v)}
                        className="relative overflow-hidden rounded ring-1 ring-gray-100"
                        style={{ width: VARIANT_IMG, height: VARIANT_IMG }}
                        title={v.name ?? v.sku ?? 'Variant'}
                      >
                        <Image
                          src={vImg}
                          alt={v.name ?? v.sku ?? 'Variant'}
                          fill
                          sizes="100px"
                          className="object-cover"
                        />
                      </button>
                    )}
                  </Cell>

                  {/* 2) Info variante: riga 1 SKU+Brand, riga 2 Model */}
                  <Cell>
                    <div className="min-w-0">
                      <div className="flex items-center text-xs text-gray-600 whitespace-nowrap gap-1.5 min-w-0">
                        <span className="uppercase">{v.sku ?? sku ?? '-'}</span>
                        {brand?.name && brand?.id !== '0' ? (
                          <>
                            <span className="text-gray-300">•</span>
                            <Link
                              href={`/${lang}/search?filters-id_brand=${brand.id}`}
                              className="text-brand hover:underline uppercase truncate max-w-[65%]"
                              title={brand.name}
                            >
                              {brand.name}
                            </Link>
                          </>
                        ) : (
                          ''
                        )}
                      </div>
                      {v.model ? (
                        <div className="text-[13px] text-gray-700 mt-0.5 line-clamp-1">
                          {t('model', { defaultValue: 'model:' })} <strong>{v.model}</strong>
                        </div>
                      ) : (
                        <div className="text-[13px] text-gray-400 mt-0.5">''</div>
                      )}

                      {vPrice?.packaging_option_default && (
                        <div className="text-[13px] text-gray-700 mt-0.5 line-clamp-1">
                          {vPrice
                            && formatAvailability(
                              vPrice.availability,
                              vPrice.packaging_option_default?.packaging_uom
                            )}
                        </div>
                      )}

                    </div>
                  </Cell>

                  {/* 3) Packaging */}
                  <Cell><PackagingGrid pd={vPrice} /></Cell>

                  {/* 4) Ordered */}
                  <Cell>
                    {vPrice?.buy_did ? (
                      <div className="flex flex-col items-start sm:items-center gap-1">
                        <span className="bg-gray-700 text-white px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          {t('ordered', { defaultValue: 'ORDERED' })}
                        </span>
                        <span className="text-xs text-gray-700">{vPrice.buy_did_last_date}</span>
                      </div>
                    ) : (
                      <div className="text-center sm:text-right text-gray-300"></div>
                    )}
                  </Cell>
                  {/* 5) Ordered */}
                  <Cell>

                    {vPrice && (
                      <PriceAndPromo
                        name={name}
                        sku={sku}
                        priceData={vPrice}
                        currency="EUR"
                        withSchemaOrg={true}
                        // className="px-3 py-1 justify-start" // optional tweaks
                        onPromosClick={() => {
                          // open promo modal, or show toast, etc.
                          // openModal('PROMOS_LIST', priceData)
                        }}
                      />
                    )}
                  </Cell>

                  {/* 6)  Add */}
                  <Cell>
                    <div className="flex flex-col justify-center items-end gap-2">

                      <AddToCart product={isPseudo ? (product as any) : v} priceData={vPrice} variant="venus" lang={lang} className='justify-end' />
                    </div>
                  </Cell>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
