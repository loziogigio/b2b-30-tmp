/**
 * PIM S3 image versioning utilities.
 *
 * PIM pre-generates resized variants on S3 by prefixing the filename:
 *   .../product_images/sku/photo.jpg
 *   .../product_images/sku/main_photo.jpg     (medium — product cards)
 *   .../product_images/sku/gallery_photo.jpg  (small  — thumbnails, cart)
 *
 * Use the helpers below to pick the right variant per context.
 */

/** Insert a size prefix before the filename in a URL. */
export function prefixImageUrl(
  url: string | undefined | null,
  prefix: 'gallery_' | 'main_',
): string | undefined {
  if (!url) return undefined;
  const lastSlash = url.lastIndexOf('/');
  if (lastSlash === -1) return url;
  return `${url.slice(0, lastSlash + 1)}${prefix}${url.slice(lastSlash + 1)}`;
}

/**
 * Pick the best image URL for a given context.
 *
 * | Context         | Priority                            |
 * |-----------------|-------------------------------------|
 * | Product card    | main_ > gallery_ > original         |
 * | Cart / wishlist | gallery_ > main_ > original         |
 * | Detail slider   | original (full size)                |
 * | Detail thumbs   | gallery_ > main_ > original         |
 */
export function cartImageUrl(
  url: string | undefined | null,
): string | undefined {
  return prefixImageUrl(url, 'gallery_') ?? url ?? undefined;
}

export function cardImageUrl(
  url: string | undefined | null,
): string | undefined {
  return prefixImageUrl(url, 'main_') ?? url ?? undefined;
}
