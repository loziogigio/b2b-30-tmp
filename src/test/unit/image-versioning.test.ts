import { describe, expect, it } from 'vitest';
import {
  cardImageUrl,
  cartImageUrl,
  prefixImageUrl,
} from '@utils/image-versioning';

describe('image-versioning', () => {
  it('returns undefined for empty image URLs', () => {
    expect(prefixImageUrl('', 'gallery_')).toBeUndefined();
    expect(cartImageUrl('')).toBeUndefined();
    expect(cardImageUrl('   ')).toBeUndefined();
  });

  it('prefixes cart and card image filenames', () => {
    const imageUrl = 'https://cdn.example.com/product_images/sku/photo.jpg';

    expect(cartImageUrl(imageUrl)).toBe(
      'https://cdn.example.com/product_images/sku/gallery_photo.jpg',
    );
    expect(cardImageUrl(imageUrl)).toBe(
      'https://cdn.example.com/product_images/sku/main_photo.jpg',
    );
  });

  it('keeps URLs without paths unchanged', () => {
    expect(cartImageUrl('photo.jpg')).toBe('photo.jpg');
  });
});
