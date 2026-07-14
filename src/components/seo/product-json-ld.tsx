'use client';

import { Product } from '@framework/types';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { selectBestPrice } from '@framework/pricing/best-price';
import { absoluteProductDetailUrl } from '@/lib/seo/product-url';

interface ProductJsonLdProps {
  product: Product;
  priceData?: ErpPriceData;
  lang: string;
  siteUrl?: string;
  canonicalUrl?: string;
}

export default function ProductJsonLd({
  product,
  priceData,
  lang,
  siteUrl: configuredSiteUrl,
  canonicalUrl,
}: ProductJsonLdProps) {
  if (!product) return null;

  const siteUrl =
    configuredSiteUrl || process.env.NEXT_PUBLIC_WEBSITE_URL || '';
  const productUrl =
    canonicalUrl ||
    absoluteProductDetailUrl(siteUrl, lang, product) ||
    undefined;

  // Get product image
  const productImage =
    product.image?.original ||
    product.image?.thumbnail ||
    (product.gallery?.[0] as any)?.original ||
    '';

  // Advertise the price we actually charge. `price_discount` carries the ERP's
  // pre-selected improving_promo, which is not necessarily the price the site
  // displays or books — a cheaper promo may exist, and the listino itself can
  // undercut every promo. Structured data must not advertise a price we do not
  // honour, so it goes through the same selector as the storefront and the cart.
  const bestPrice = selectBestPrice(priceData);
  const price =
    bestPrice.effectivePrice > 0 ? bestPrice.effectivePrice : undefined;

  // Availability mapping
  const availability =
    priceData && Number(priceData.availability) > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  // Build JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description:
      product.description ||
      (product as any).short_description ||
      `${product.name} - SKU: ${product.sku}`,
    sku: product.sku,
    mpn: product.sku,
    image: productImage ? [productImage] : undefined,
    url: productUrl,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand.name || product.brand.label,
        }
      : undefined,
    offers: price
      ? {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'EUR',
          price: Number(price).toFixed(2),
          availability,
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined,
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}
