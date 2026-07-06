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

function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  return trimmed || undefined;
}

/** Insert a size prefix before the filename in a URL. */
export function prefixImageUrl(
  url: string | undefined | null,
  prefix: 'gallery_' | 'main_',
): string | undefined {
  const imageUrl = normalizeImageUrl(url);
  if (!imageUrl) return undefined;
  const lastSlash = imageUrl.lastIndexOf('/');
  if (lastSlash === -1) return imageUrl;
  return `${imageUrl.slice(0, lastSlash + 1)}${prefix}${imageUrl.slice(lastSlash + 1)}`;
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
  const imageUrl = normalizeImageUrl(url);
  return prefixImageUrl(imageUrl, 'gallery_') ?? imageUrl;
}

export function cardImageUrl(
  url: string | undefined | null,
): string | undefined {
  const imageUrl = normalizeImageUrl(url);
  return prefixImageUrl(imageUrl, 'main_') ?? imageUrl;
}
