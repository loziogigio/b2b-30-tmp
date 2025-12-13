import type { ProductInfoBlockConfig } from '@/lib/types/blocks';

interface ProductInfoBlockProps {
  config: ProductInfoBlockConfig;
  productData: any;
}

export function ProductInfoBlock({
  config,
  productData,
}: ProductInfoBlockProps) {
  if (!productData) {
    return null;
  }

  const {
    showImages = true,
    showPrice = true,
    showDescription = true,
    showSpecifications = true,
    showAvailability = true,
    layout = 'default',
  } = config;

  return (
    <div className={`product-info-block layout-${layout}`}>
      {/* This will use the existing B2BProductDetail component or similar */}
      {/* For now, just a placeholder that you can customize */}
      <div className="product-info-content">
        <p className="text-sm text-gray-500">
          Product Info Block (to be integrated with existing component)
        </p>
        <pre className="text-xs">
          {JSON.stringify({ showImages, showPrice, showDescription }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
