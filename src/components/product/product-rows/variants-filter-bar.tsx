import cn from 'classnames';
import React, { useRef } from 'react';

type SortKey = 'sku-asc' | 'price-asc' | 'price-desc';

interface Props {
  query: string;
  onQueryChange: (val: string) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  modelOptions: string[];
  selectedModels: string[];
  onToggleModel: (model: string) => void;
  onClearModels: () => void;
  isAuthorized: boolean;
  className?: string;
  searchPlaceholder?: string;
  showSearchAndSort?: boolean;
}

export default function VariantsFilterBar({
  query,
  onQueryChange,
  sortKey,
  onSortChange,
  modelOptions,
  selectedModels,
  onToggleModel,
  onClearModels,
  isAuthorized,
  className,
  searchPlaceholder = 'Search SKU, name, model…',
  showSearchAndSort = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className={cn(className)}>
      {/* Row 1: search + sort */}
      {showSearchAndSort && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full h-10 sm:h-11 rounded-md border px-3 pr-9 text-sm bg-white',
                'border-gray-300 placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'
              )}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                onClick={() => {
                  onQueryChange('');
                  inputRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>

          {isAuthorized && (
            <div className="shrink-0 ml-auto">
              <select
                aria-label="Sort variants"
                value={sortKey}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                className="h-10 sm:h-11 rounded-md border px-2 text-sm border-gray-300 bg-white"
              >
                <option value="sku-asc">Sort: SKU (A→Z)</option>
                <option value="price-asc">Sort: Price (Low→High)</option>
                <option value="price-desc">Sort: Price (High→Low)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Row 2: Tags */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {modelOptions.map((m) => (
          <button
            key={`mdl-${m}`}
            type="button"
            className={cn(
              'px-2 py-1 rounded-md border text-xs font-medium transition-colors',
              selectedModels.includes(m)
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            )}
            onClick={() => onToggleModel(m)}
          >
            {m}
          </button>
        ))}

        {selectedModels.length > 0 && (
          <button
            type="button"
            className="ml-1 px-2 py-1 rounded-md border text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onClearModels}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
