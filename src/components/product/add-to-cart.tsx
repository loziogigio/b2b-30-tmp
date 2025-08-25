import Counter from '@components/ui/counter';
import { useCart } from '@contexts/cart/cart.context';
import { generateCartItem } from '@utils/generate-cart-item';
import useWindowSize from '@utils/use-window-size';
import { useTranslation } from 'src/app/i18n/client';
import { ErpPriceData } from '@utils/transform/erp-prices';
import React from 'react';
import cn from 'classnames';

interface AddToCartProps {
  lang: string;
  product: any;
  variation?: any;
  disabled?: boolean;
  variant?: any;
  priceData?: ErpPriceData;
  showPlaceholder?: boolean;
  className?: string; 



}

function CounterPlaceholder({ className }: { className?: string }) {
  // Same height as the real control to avoid layout shift
  return (
    <div
      className={cn(
        'w-full h-10 rounded-md border border-gray-200 bg-gray-100 animate-pulse',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    />
  );
}


const AddToCart = ({
  lang,
  product,
  priceData,
  showPlaceholder = true,
  className,

}: AddToCartProps) => {
  // Decide if we have enough data to render the control:
  const meta = product?.__cartMeta;
  const hasCounterData = !!priceData || !!meta;

  if (!hasCounterData) {
    return showPlaceholder ? <CounterPlaceholder className="w-full" /> : null;
  }

  // Build a stable key that differentiates product + packaging/variant


  // Use priceData if present, else fall back to cached meta
  const effectivePriceData = (priceData ?? meta) as ErpPriceData;

  return (
    <Counter
      className={cn(
        'w-full h-10',
        className ? className : 'justify-center' 
      )}
      data={product}
      lang={lang}
      priceData={effectivePriceData}
    />
  );  
};

export default AddToCart;
