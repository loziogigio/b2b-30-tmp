'use client';

import { TransformedOrderItem } from '@utils/transform/b2b-order';
import cn from 'classnames';
import Image from 'next/image';

type Props = {
  items?: TransformedOrderItem[];
  /** Scrollable body height (px or CSS string). Default 360px */
  height?: number | string;
  className?: string;
};

export default function OrderItemsTable({
  items = [],
  height = 360,
  className,
}: Props) {
  const hStyle =
    typeof height === 'number' ? { height: `${height}px` } : { height };

  // shared grid template: prevents overflow with minmax(0, …)
  const gridCols =
    'grid grid-cols-[minmax(0,1fr)_120px_120px_minmax(0,160px)_120px]';

  return (
    <div className={cn('overflow-hidden rounded-lg border border-gray-200', className)}>
      {/* Scroll container (header + rows live here, so header can be sticky) */}
      <div
        className="relative overflow-y-auto overflow-x-hidden overscroll-contain pr-2"
        style={hStyle}
      >
        {/* sticky header */}
        <div
          className={cn(
            'sticky top-0 z-10',
            gridCols,
            'gap-4 border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 min-w-0'
          )}
        >
          <span>Item</span>
          <span className="text-center">Unit Price</span>
          <span className="text-center">Qty Order.</span>
          <span className="text-center">Price</span>
          <span className="text-right">Qty Delive.</span>
        </div>

        {/* body */}
        {items.length ? (
          <div className="divide-y">
            {items.map((it) => {
              const deliveredState =
                it.delivered_in_quantity >= it.ordered_in_quantity
                  ? 'full'
                  : it.delivered_in_quantity > 0
                  ? 'partial'
                  : 'none';

              return (
                <div
                  key={it.id}
                  className={cn(gridCols, 'gap-4 px-4 py-4 min-w-0')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200 bg-gray-100">
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt={it.name ?? ''}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-blue-600 font-semibold">{it.sku}</div>
                      <div className="truncate font-medium text-gray-900">{it.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-sm">
                    {it.price.toFixed(2)}
                  </div>

                  <div className="flex items-center justify-center text-sm">
                    {it.ordered_in_quantity} {it.unit}
                  </div>

                  <div className="flex items-center justify-center text-sm">
                    {it.delivered_in_price}
                  </div>

                  <div
                    className={cn(
                      'flex items-center justify-end gap-2 text-sm font-semibold px-2 py-1 rounded-md w-fit ml-auto')}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        deliveredState === 'full' && 'bg-green-500',
                        deliveredState === 'partial' && 'bg-yellow-500',
                        deliveredState === 'none' && 'bg-red-500'
                      )}
                    />
                    {it.delivered_in_quantity} {it.unit}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-gray-500">
            No items found for this order.
          </div>
        )}
      </div>
    </div>
  );
}
