'use client';

import { useEffect, useState } from 'react';
import B2BProductDetail from '@components/product/feeds/b2b-product-detail';
import { ProductPreviewListener } from './ProductPreviewListener';
import type { PageBlock } from '@/lib/types/blocks';

interface ProductDetailWithPreviewProps {
  lang: string;
  sku: string;
  serverBlocks: PageBlock[];
  isPreview?: boolean;
}

/**
 * Client wrapper that listens for live preview updates via postMessage
 * Falls back to server-provided blocks if no live preview data available
 */
export function ProductDetailWithPreview({
  lang,
  sku,
  serverBlocks,
  isPreview = false
}: ProductDetailWithPreviewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <ProductPreviewListener currentProductId={isPreview ? undefined : sku}>
      {(previewState) => {
        const liveBlocks = isHydrated ? previewState?.blocks : undefined;
        const hasLiveBlocks = Array.isArray(liveBlocks);
        // Use live blocks from postMessage if available (after hydration), otherwise use server blocks
        const blocks: PageBlock[] = hasLiveBlocks ? (liveBlocks as PageBlock[]) : serverBlocks;
        const isUsingLivePreview = isHydrated && isPreview && hasLiveBlocks;
        const hasUnsavedChanges = previewState?.isDirty ?? true;
        const blockCount = blocks.length;

        // Show indicator when using live preview
        if (isUsingLivePreview) {
          console.log(
            '[Preview Mode] Using live blocks from builder:',
            blockCount,
            'dirty:',
            hasUnsavedChanges
          );
        }

        return (
          <>
            {isUsingLivePreview && (
              <div
                className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 text-white shadow-lg ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                }`}
              >
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="font-semibold">PREVIEW MODE</span>
                    <span className="text-sm opacity-90">
                      {hasUnsavedChanges
                        ? 'Live preview from builder — changes not saved to database'
                        : 'Live preview from builder — synced with saved version'}
                    </span>
                  </div>
                  <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium">
                    {blockCount} block{blockCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
            <div className={isUsingLivePreview ? 'pt-14' : ''}>
              <B2BProductDetail lang={lang} sku={sku} blocks={blocks} showZoneLabels={isUsingLivePreview} />
            </div>
          </>
        );
      }}
    </ProductPreviewListener>
  );
}
