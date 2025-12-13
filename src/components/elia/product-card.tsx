import Image from 'next/image';
import { AiOutlineStar, AiOutlineInbox } from 'react-icons/ai';
import type { ProductResult } from '@/lib/elia/types';

interface ProductCardProps {
  product: ProductResult;
}

export function ProductCard({ product }: ProductCardProps) {
  const relevancePercent = Math.round(product.relevance_score * 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <AiOutlineInbox className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Relevance badge */}
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <AiOutlineStar className="w-3 h-3" />
          {relevancePercent}%
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        )}

        {/* Name */}
        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600">
            €{product.price.toFixed(2)}
          </span>

          <span
            className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>

        {/* Attributes */}
        {Object.keys(product.attributes).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(product.attributes).map(
              ([key, value]) =>
                value && (
                  <span
                    key={key}
                    className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600"
                  >
                    {value}
                  </span>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
