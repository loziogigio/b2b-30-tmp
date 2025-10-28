"use client";

import { useEffect, useMemo } from "react";
import { Product } from '@framework/types';
import { ErpPriceData } from '@utils/transform/erp-prices';
import ProductCardB2B from './product-cards/product-card-b2b';
import ProductCardB2BHorizontal from './product-cards/product-card-b2b-horizontal';
import { useHomeSettings, getCardStyleCSS, getCardHoverClass } from '@/hooks/use-home-settings';

interface ProductCardWrapperProps {
  lang: string;
  product: Product;
  priceData?: ErpPriceData;
  forceVariant?: "b2b" | "horizontal";
  className?: string;
}

/**
 * Wrapper component that applies home settings to product cards
 * Automatically fetches settings and applies card variant + custom styles
 */
export default function ProductCardWrapper({
  lang,
  product,
  priceData,
  forceVariant,
  className
}: ProductCardWrapperProps) {
  const { settings, isLoading } = useHomeSettings();
  const globalCardStyle = settings?.cardStyle;
  const hoverEffect = globalCardStyle?.hoverEffect;

  // Determine which variant to use
  const variant = forceVariant || settings?.defaultCardVariant || "b2b";

  // Get custom styles
  const customStyle = globalCardStyle ? getCardStyleCSS(globalCardStyle) : undefined;

  const hoverClass = globalCardStyle ? getCardHoverClass(globalCardStyle.hoverEffect) : "";
  const hoverBackgroundColor =
    hoverEffect === "shadow" ? undefined : globalCardStyle?.hoverBackgroundColor;

  const hoverBackgroundClass = useMemo(() => {
    if (!hoverBackgroundColor) return undefined;
    return `card-hover-bg-${hoverBackgroundColor.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  }, [hoverBackgroundColor]);

  const combinedClassName = useMemo(
    () =>
      [className, hoverClass, hoverBackgroundClass, hoverBackgroundColor ? "transition-colors duration-200" : undefined]
        .filter(Boolean)
        .join(" "),
    [className, hoverClass, hoverBackgroundClass, hoverBackgroundColor]
  );

  // Apply hover background color styles (MUST be before any early returns)
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!hoverBackgroundClass || !hoverBackgroundColor) return;
    const styleId = `hover-style-${hoverBackgroundClass}`;
    if (document.getElementById(styleId)) {
      return;
    }
    const styleTag = document.createElement("style");
    styleTag.id = styleId;
    styleTag.textContent = `.${hoverBackgroundClass}:hover { background-color: ${hoverBackgroundColor}; }`;
    document.head.appendChild(styleTag);
  }, [hoverBackgroundClass, hoverBackgroundColor]);

  // While loading, show default card (AFTER all hooks)
  if (isLoading) {
    return (
      <ProductCardB2B
        lang={lang}
        product={product}
        priceData={priceData}
        className={className}
      />
    );
  }

  const cardElement =
    variant === "horizontal" ? (
      <ProductCardB2BHorizontal
        lang={lang}
        product={product}
        priceData={priceData}
        customStyle={customStyle}
        className={combinedClassName}
      />
    ) : (
      <ProductCardB2B
        lang={lang}
        product={product}
        priceData={priceData}
        customStyle={customStyle}
        className={combinedClassName}
      />
    );

  // Render appropriate card variant
  return cardElement;
}
