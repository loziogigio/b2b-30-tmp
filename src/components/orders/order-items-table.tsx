'use client';

import { useState, useMemo } from 'react';
import { TransformedOrderItem } from '@utils/transform/b2b-order';
import cn from 'classnames';
import Image from 'next/image';
import { useTranslation } from 'src/app/i18n/client';

type Props = {
  items?: TransformedOrderItem[];
  /** Scrollable body height (px or CSS string). Default 360px */
  height?: number | string;
  className?: string;
  lang?: string;
};

export default function OrderItemsTable({
  items = [],
  height = 360,
  className,
  lang = 'it',
}: Props) {
  const { t } = useTranslation(lang, 'common');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) =>
        (it.sku ?? '').toLowerCase().includes(q) ||
        (it.name ?? '').toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const hStyle =
    typeof height === 'number' ? { height: `${height}px` } : { height };

  // shared grid template: prevents overflow with minmax(0, …)
  const gridCols =
    'grid grid-cols-[minmax(0,1fr)_120px_120px_minmax(0,160px)_120px]';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-gray-200',
        className,
      )}
    >
      {/* Search input */}
      <div className="border-b bg-white px-4 py-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('orders-search-items')}
            className="h-9 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-gray-500">
            {filteredItems.length} {t('orders-results-found')}
          </p>
        )}
      </div>
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
            'gap-4 border-b bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 min-w-0',
          )}
        >
          <span>{t('orders-item')}</span>
          <span className="text-center">{t('orders-unit-price')}</span>
          <span className="text-center">{t('orders-qty-ordered')}</span>
          <span className="text-center">{t('orders-price')}</span>
          <span className="text-right">{t('orders-qty-delivered')}</span>
        </div>

        {/* body */}
        {filteredItems.length ? (
          <div className="divide-y">
            {filteredItems.map((it) => {
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
                      <div className="text-xs text-blue-600 font-semibold">
                        {it.sku}
                      </div>
                      <div className="truncate font-medium text-gray-900">
                        {it.name}
                      </div>
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
                      'flex items-center justify-end gap-2 text-sm font-semibold px-2 py-1 rounded-md w-fit ml-auto',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        deliveredState === 'full' && 'bg-green-500',
                        deliveredState === 'partial' && 'bg-yellow-500',
                        deliveredState === 'none' && 'bg-red-500',
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
            {t('orders-no-items')}
          </div>
        )}
      </div>
    </div>
  );
}
