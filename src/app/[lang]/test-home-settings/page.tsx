'use client';

import { useParams } from 'next/navigation';
import ProductCardWrapper from '@/components/product/product-card-wrapper';
import { useHomeSettings, applyBrandingCSS } from '@/hooks/use-home-settings';
import { useEffect } from 'react';

// Mock product data for testing
const MOCK_PRODUCT = {
  id: '1',
  name: 'Premium Hydronic Heating System',
  sku: 'HYD-001',
  slug: 'premium-hydronic-heating-system',
  brand: { name: 'ThermoFlow', id: '1' },
  model: 'TF-3000X',
  image: {
    thumbnail:
      'https://images.unsplash.com/photo-1620825141088-a824daf6a46b?auto=format&fit=crop&w=400&q=80',
    original:
      'https://images.unsplash.com/photo-1620825141088-a824daf6a46b?auto=format&fit=crop&w=800&q=80',
  },
  price: 299.99,
  sale_price: 249.99,
  variations: [],
  quantity: 50,
  parent_sku: null,
  product_type: 'simple',
  unit: 'unit',
  description:
    'High-efficiency hydronic heating system for residential and commercial applications.',
};

const MOCK_PRICE_DATA = {
  is_promo: true,
  availability: 50,
  buy_did: true,
  buy_did_last_date: '2024-12-15',
  packaging_option_default: { packaging_uom: 'pcs' },
  product_label_action: { LABEL: 'In Stock' },
};

export default function TestHomeSettingsPage() {
  const params = useParams();
  const lang = (params?.lang as string) || 'en';

  const { settings, isLoading, error } = useHomeSettings();

  // Apply branding CSS to the page
  useEffect(() => {
    if (settings?.branding) {
      applyBrandingCSS(settings.branding);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">
            Error Loading Settings
          </h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Home Settings Test Page
        </h1>
        <p className="text-gray-600">
          Testing product card styles from B2B home settings
        </p>
      </div>

      {/* Settings Info */}
      {settings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Current Settings for: {settings.branding?.title || 'Storefront'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Card Variant:</span>
              <span className="ml-2 text-blue-600">
                {settings.defaultCardVariant}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Border Width:</span>
              <span className="ml-2 text-blue-600">
                {settings.cardStyle?.borderWidth}px
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Border Radius:</span>
              <span className="ml-2 text-blue-600">
                {settings.cardStyle?.borderRadius}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Shadow Size:</span>
              <span className="ml-2 text-blue-600">
                {settings.cardStyle?.shadowSize}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Hover Effect:</span>
              <span className="ml-2 text-blue-600">
                {settings.cardStyle?.hoverEffect}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Primary Color:</span>
              <div className="inline-flex items-center ml-2">
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: settings.branding?.primaryColor }}
                />
                <span className="ml-2 text-blue-600">
                  {settings.branding?.primaryColor}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Cards Demo */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Product Cards with Applied Settings
        </h2>

        {/* Grid Layout */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Grid Layout (3 columns)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProductCardWrapper
              lang={lang}
              product={MOCK_PRODUCT}
              priceData={MOCK_PRICE_DATA}
            />
            <ProductCardWrapper
              lang={lang}
              product={{
                ...MOCK_PRODUCT,
                id: '2',
                name: 'Advanced Water Filtration System',
                sku: 'WF-002',
                model: 'AQ-500',
                price: 199.99,
                sale_price: null,
              }}
              priceData={{
                ...MOCK_PRICE_DATA,
                is_promo: false,
                buy_did: false,
              }}
            />
            <ProductCardWrapper
              lang={lang}
              product={{
                ...MOCK_PRODUCT,
                id: '3',
                name: 'Smart Thermostat Controller',
                sku: 'THERM-003',
                model: 'ST-2000',
                price: 149.99,
              }}
              priceData={MOCK_PRICE_DATA}
            />
          </div>
        </div>

        {/* Force Horizontal Layout */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Horizontal Layout (forced)
          </h3>
          <div className="space-y-4">
            <ProductCardWrapper
              lang={lang}
              product={MOCK_PRODUCT}
              priceData={MOCK_PRICE_DATA}
              forceVariant="horizontal"
            />
            <ProductCardWrapper
              lang={lang}
              product={{
                ...MOCK_PRODUCT,
                id: '4',
                name: 'Commercial Grade Boiler Unit',
                sku: 'BOIL-004',
                model: 'CGB-8000',
                price: 899.99,
              }}
              priceData={MOCK_PRICE_DATA}
              forceVariant="horizontal"
            />
          </div>
        </div>

        {/* Force Vertical Layout */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Vertical Layout (forced)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <ProductCardWrapper
                key={i}
                lang={lang}
                product={{
                  ...MOCK_PRODUCT,
                  id: `${i + 4}`,
                  name: `Product ${i}`,
                  sku: `PROD-00${i + 4}`,
                }}
                priceData={MOCK_PRICE_DATA}
                forceVariant="b2b"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          How to Test
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>
            Go to{' '}
            <a
              href="/b2b/home-settings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline font-medium"
            >
              /b2b/home-settings
            </a>
          </li>
          <li>
            Change border width, border radius, shadow size, or hover effects
          </li>
          <li>Click "Save Settings"</li>
          <li>Refresh this page to see the changes applied</li>
          <li>Hover over the cards to see hover effects in action</li>
        </ol>
      </div>
    </div>
  );
}
