'use client';

import Link from 'next/link';
import Image from 'next/image';
import cn from 'classnames';

type GalleryItem = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  price?: string;
  badge?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
};

type ProductGalleryBlockProps = {
  items: GalleryItem[];
  columns: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  gap?: number;
  showPrice?: boolean;
  showBadge?: boolean;
  showAddToCart?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const columnClass = (size: 'base' | 'sm' | 'md' | 'lg' | 'xl', count: number) => {
  const clamped = clamp(Math.round(count), 1, 6);
  const prefix = size === 'base' ? '' : `${size}:`;
  switch (clamped) {
    case 1:
      return `${prefix}grid-cols-1`;
    case 2:
      return `${prefix}grid-cols-2`;
    case 3:
      return `${prefix}grid-cols-3`;
    case 4:
      return `${prefix}grid-cols-4`;
    case 5:
      return `${prefix}grid-cols-5`;
    default:
      return `${prefix}grid-cols-6`;
  }
};

export const ProductGalleryBlock = ({
  items,
  columns,
  gap = 16,
  showPrice = true,
  showBadge = true,
  showAddToCart = false
}: ProductGalleryBlockProps) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const mobileCols = clamp(columns?.mobile ?? 1, 1, 4);
  const tabletCols = clamp(columns?.tablet ?? Math.max(mobileCols, 2), mobileCols, 5);
  const desktopCols = clamp(columns?.desktop ?? Math.max(tabletCols, 4), tabletCols, 6);

  const gridClasses = cn(
    'grid',
    columnClass('base', mobileCols),
    columnClass('sm', tabletCols),
    columnClass('lg', desktopCols)
  );

  return (
    <div className={gridClasses} style={{ gap }}>
      {items.map((item) => {
        const card = (
          <article
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] w-full bg-slate-100">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title || ''}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  No image
                </div>
              )}
              {showBadge && item.badge ? (
                <span className="absolute left-4 top-4 rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white shadow">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-2 px-5 py-4">
              {item.title ? (
                <h3 className="text-base font-semibold text-slate-800">{item.title}</h3>
              ) : null}
              {item.subtitle ? (
                <p className="text-sm text-slate-500 line-clamp-2">{item.subtitle}</p>
              ) : null}
              {showPrice && item.price ? (
                <div className="mt-auto text-lg font-semibold text-emerald-600">{item.price}</div>
              ) : (
                <div className="mt-auto" />
              )}
              {showAddToCart ? (
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Add to cart
                </button>
              ) : null}
            </div>
          </article>
        );

        if (item.linkUrl) {
          return (
            <Link
              key={item.id}
              href={item.linkUrl}
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              className="block h-full"
            >
              {card}
            </Link>
          );
        }

        return (
          <div key={item.id} className="h-full">
            {card}
          </div>
        );
      })}
    </div>
  );
};

export default ProductGalleryBlock;
