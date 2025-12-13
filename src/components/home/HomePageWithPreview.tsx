'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductPreviewListener } from '@components/product/ProductPreviewListener';
import HomeBlockRenderer from '@components/blocks/HomeBlockRenderer';
import type { PageBlock, PageVersionTags } from '@/lib/types/blocks';
import { serializeTagsKey } from '@/lib/page-context';
import Container from '@components/ui/container';

interface HomePageWithPreviewProps {
  lang: string;
  serverBlocks: PageBlock[];
  cmsData: any;
  isPreview?: boolean;
  templateTags?: PageVersionTags;
  matchInfo?: string | null;
}

// Full page skeleton component - responsive for mobile/tablet/desktop
const HomePageSkeleton = () => (
  <div className="animate-pulse">
    {/* Hero section skeleton - matches HeroCarouselWithWidgets dimensions */}
    <Container>
      <div className="mt-4 grid gap-4 h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px] lg:grid-cols-[1fr_1fr_minmax(180px,0.3fr)]">
        {/* Main carousel area - full width on mobile, 2 cols on desktop */}
        <div className="col-span-1 lg:col-span-2 rounded-xl bg-gray-200" />
        {/* Weather widget - hidden on mobile/tablet, visible on lg+ */}
        <div className="hidden lg:block rounded-xl bg-gradient-to-br from-indigo-300 via-blue-400 to-indigo-500" />
      </div>
    </Container>

    {/* Secondary banner carousel skeleton */}
    <Container>
      <div className="mt-6 sm:mt-8 mb-6">
        {/* Responsive grid: 2 cols mobile, 3 tablet, 4-5 desktop */}
        <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex-shrink-0 aspect-[4/3] rounded-lg bg-gray-200 ${
                i >= 2 ? 'hidden sm:block' : ''
              } ${i >= 4 ? 'sm:hidden lg:block' : ''}`}
              style={{ width: 'calc(50% - 4px)', maxWidth: '220px' }}
            />
          ))}
        </div>
      </div>
    </Container>

    {/* Products section skeleton */}
    <Container>
      <div className="mt-6 sm:mt-8 mb-6">
        <div className="h-5 sm:h-6 w-32 sm:w-40 bg-gray-200 rounded mb-4" />
        {/* Responsive: 2 cols mobile, 3 tablet, 4-5 desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`rounded-lg border border-gray-100 bg-white p-2 sm:p-3 ${
                i >= 4 ? 'hidden xl:block' : ''
              } ${i >= 3 ? 'hidden lg:block' : ''}`}
            >
              <div className="aspect-square bg-gray-200 rounded mb-2 sm:mb-3" />
              <div className="h-2 sm:h-3 w-12 sm:w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 sm:h-4 w-full bg-gray-200 rounded mb-1 sm:mb-2" />
              <div className="h-3 sm:h-4 w-3/4 bg-gray-200 rounded mb-2 sm:mb-3" />
              <div className="h-5 sm:h-6 w-16 sm:w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Container>

    {/* Categories section skeleton */}
    <Container>
      <div className="mt-6 sm:mt-8 mb-6">
        <div className="h-5 sm:h-6 w-36 sm:w-44 bg-gray-200 rounded mb-4" />
        {/* Responsive: 3 cols mobile, 4-6 tablet, 6-8 desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`flex flex-col items-center ${
                i >= 6 ? 'hidden xl:flex' : ''
              } ${i >= 5 ? 'hidden lg:flex' : ''} ${
                i >= 4 ? 'hidden md:flex' : ''
              } ${i >= 3 ? 'hidden sm:flex' : ''}`}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200 mb-2" />
              <div className="h-2 sm:h-3 w-10 sm:w-14 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  </div>
);

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
  matchInfo,
}: HomePageWithPreviewProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const tagKey = templateTags ? serializeTagsKey(templateTags) : 'default';
  const previewTargetId = !isPreview ? `home:${tagKey}` : undefined;

  // All hooks must be called before any conditional returns
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

  // Show skeleton until hydrated (after all hooks)
  if (!isHydrated) {
    return <HomePageSkeleton />;
  }

  return (
    <ProductPreviewListener currentProductId={previewTargetId}>
      {(previewState) => {
        const liveBlocks = isHydrated ? previewState?.blocks : undefined;
        const hasLiveBlocks = Array.isArray(liveBlocks);
        // Use live blocks from postMessage if available (after hydration), otherwise use server blocks
        const blocks: PageBlock[] = hasLiveBlocks
          ? (liveBlocks as PageBlock[])
          : serverBlocks;
        // Show preview UI (badges, banner) whenever in preview mode - don't wait for postMessage
        const showPreviewUI = isHydrated && isPreview;
        const hasUnsavedChanges = previewState?.isDirty ?? true;
        const blockCount = blocks.length;

        return (
          <>
            {showPreviewUI && (
              <div
                className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 text-white shadow-lg ${
                  hasLiveBlocks
                    ? hasUnsavedChanges
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
              >
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="font-semibold">
                      HOME PAGE PREVIEW MODE
                    </span>
                    <span className="text-sm opacity-90">
                      {hasLiveBlocks
                        ? hasUnsavedChanges
                          ? 'Live preview from builder — changes not saved to database'
                          : 'Live preview from builder — synced with saved version'
                        : 'Showing server blocks — waiting for builder connection'}
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
            <div className={showPreviewUI ? 'pt-14' : ''}>
              {blocks.map((block: any, index: number) => {
                const position = block._builderPosition || index + 1;
                return (
                  <div key={block.id} className="relative group">
                    {showPreviewUI && (
                      <div className="absolute left-2 top-2 z-40 flex items-center gap-2 rounded-md bg-slate-800/60 px-2 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-[10px]">
                          {position}
                        </span>
                        <span className="opacity-80">{block.type}</span>
                      </div>
                    )}
                    <HomeBlockRenderer
                      block={block}
                      lang={lang}
                      cmsData={cmsData}
                    />
                  </div>
                );
              })}
            </div>
          </>
        );
      }}
    </ProductPreviewListener>
  );
}
