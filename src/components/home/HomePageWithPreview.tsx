'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductPreviewListener } from '@components/product/ProductPreviewListener';
import HomeBlockRenderer from '@components/blocks/HomeBlockRenderer';
import type { PageBlock, PageVersionTags } from '@/lib/types/blocks';
import { serializeTagsKey } from '@/lib/page-context';

interface HomePageWithPreviewProps {
  lang: string;
  serverBlocks: PageBlock[];
  cmsData: any;
  isPreview?: boolean;
  templateTags?: PageVersionTags;
  matchInfo?: string | null;
}

/**
 * Client wrapper that listens for live preview updates via postMessage
 * Falls back to server-provided blocks if no live preview data available
 */
export function HomePageWithPreview({
  lang,
  serverBlocks,
  cmsData,
  isPreview = false,
  templateTags,
  matchInfo
}: HomePageWithPreviewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tagKey = templateTags ? serializeTagsKey(templateTags) : 'default';
  const previewTargetId = !isPreview ? `home:${tagKey}` : undefined;

  const contextDescription = useMemo(() => {
    if (!templateTags) return 'default experience';
    const parts: string[] = [];
    if (templateTags.campaign) {
      parts.push(`campaign=${templateTags.campaign}`);
    }
    if (templateTags.segment) {
      parts.push(`segment=${templateTags.segment}`);
    }
    if (templateTags.attributes) {
      const attrParts = Object.entries(templateTags.attributes)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => `${key}=${value}`);
      if (attrParts.length) {
        parts.push(`attributes(${attrParts.join(', ')})`);
      }
    }
    return parts.join(' | ') || 'default experience';
  }, [templateTags]);

  return (
    <ProductPreviewListener currentProductId={previewTargetId}>
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
            '[Home Preview Mode] Using live blocks from builder:',
            blockCount,
            'dirty:',
            hasUnsavedChanges,
            'tags:',
            tagKey
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
                    <span className="font-semibold">HOME PAGE PREVIEW MODE</span>
                    <span className="text-sm opacity-90">
                      {hasUnsavedChanges
                        ? 'Live preview from builder — changes not saved to database'
                        : 'Live preview from builder — synced with saved version'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium">
                      {contextDescription}
                    </span>
                    {matchInfo && (
                      <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium">
                        Match: {matchInfo}
                      </span>
                    )}
                    <span className="rounded bg-white/20 px-3 py-1 text-xs font-medium">
                      {blockCount} block{blockCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className={isUsingLivePreview ? 'pt-14' : ''}>
              {blocks.map((block: any) => (
                <HomeBlockRenderer
                  key={block.id}
                  block={block}
                  lang={lang}
                  cmsData={cmsData}
                />
              ))}
            </div>
          </>
        );
      }}
    </ProductPreviewListener>
  );
}
