'use client';

import { Product } from '@framework/types';
import type { ErpPriceData } from '@utils/transform/erp-prices';

interface ProductJsonLdProps {
  product: Product;
  priceData?: ErpPriceData;
  lang: string;
}

export default function ProductJsonLd({
  product,
  priceData,
  lang,
}: ProductJsonLdProps) {
  if (!product) return null;

  const siteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || '';

  // Get product image
  const productImage =
    product.image?.original ||
    product.image?.thumbnail ||
    (product.gallery?.[0] as any)?.original ||
    '';

  // Get price data
  const anyPD = priceData as any;
  const price =
    anyPD?.price_discount ??
    anyPD?.net_price ??
    anyPD?.gross_price ??
    anyPD?.price_gross;

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
    url: `${siteUrl}/${lang}/products/${product.sku}`,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand.name || product.brand.label,
        }
      : undefined,
    offers: price
      ? {
          '@type': 'Offer',
          url: `${siteUrl}/${lang}/products/${product.sku}`,
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
