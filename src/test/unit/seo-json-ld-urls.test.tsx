import { afterEach, describe, expect, it } from 'vitest';
import ProductJsonLd from '@/components/seo/product-json-ld';
import CategoryJsonLd from '@/components/seo/category-json-ld';

const previousSiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL;

afterEach(() => {
  if (previousSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_WEBSITE_URL;
  } else {
    process.env.NEXT_PUBLIC_WEBSITE_URL = previousSiteUrl;
  }
});

function scriptData(element: any) {
  return JSON.parse(element.props.dangerouslySetInnerHTML.__html);
}

describe('SEO JSON-LD URLs', () => {
  it('uses the localized flat product slug for Product and Offer URLs', () => {
    process.env.NEXT_PUBLIC_WEBSITE_URL = 'https://shop.example.com/';
    const element = ProductJsonLd({
      lang: 'it',
      product: {
        sku: 'SKU-1',
        slug: { it: 'lampada-led', en: 'led-lamp' },
        name: 'Lampada',
      } as any,
      priceData: { net_price: 12.5, availability: 4 } as any,
      siteUrl: 'https://shop.example.com',
      canonicalUrl: 'https://shop.example.com/it/lampada-led',
    });

    const data = scriptData(element);
    expect(data.url).toBe('https://shop.example.com/it/lampada-led');
    expect(data.offers.url).toBe('https://shop.example.com/it/lampada-led');
  });

  it('uses the configured category root throughout category JSON-LD', () => {
    process.env.NEXT_PUBLIC_WEBSITE_URL = 'http://localhost:3000/';
    const leaf = {
      id: 'leaf',
      name: 'Lampade',
      label: 'Lampade',
      slug: 'lampade',
      path: ['illuminazione', 'lampade'],
      children: [],
    } as any;
    const element = CategoryJsonLd({
      category: leaf,
      ancestry: [leaf],
      lang: 'it',
      rootLabel: 'Tutti i gruppi',
      categoryRoot: 'prodotti',
      siteUrl: 'https://shop.example.com',
    });

    const [breadcrumbs, collection] = scriptData(element);
    expect(breadcrumbs.itemListElement[1].item).toBe(
      'https://shop.example.com/it/prodotti',
    );
    expect(breadcrumbs.itemListElement[2].item).toBe(
      'https://shop.example.com/it/prodotti/illuminazione/lampade',
    );
    expect(collection.url).toBe(
      'https://shop.example.com/it/prodotti/illuminazione/lampade',
    );
  });
});
