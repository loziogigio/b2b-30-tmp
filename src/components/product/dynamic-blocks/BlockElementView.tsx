'use client';

import React, { useEffect, useState } from 'react';
import Image from '@components/ui/image';
import { productPlaceholder } from '@assets/placeholders';
import type { BlockElement, BlockLink } from '@framework/types';

// Load @google/model-viewer once, client-side only (mirrors thumbnail-carousel.tsx:20-27)
let modelViewerLoaded = false;
const loadModelViewer = () => {
  if (typeof window !== 'undefined' && !modelViewerLoaded) {
    import('@google/model-viewer').then(() => {
      modelViewerLoaded = true;
    });
  }
};

function getYouTubeId(url: string): string | null {
  return (
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1] ?? null
  );
}

function getVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null;
}

/** Wrap a node in an anchor when the element carries a usable link. */
function MaybeLink({
  link,
  children,
}: {
  link?: BlockLink;
  children: React.ReactNode;
}) {
  if (!link?.href) return <>{children}</>;
  return (
    <a
      href={link.href}
      {...(link.new_tab
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className="block"
    >
      {children}
    </a>
  );
}

const BlockElementView: React.FC<{ element: BlockElement }> = ({ element }) => {
  const [imgError, setImgError] = useState(false);

  // Only load model-viewer when this element is actually a 3d model
  const is3d = element.kind === '3d';
  useEffect(() => {
    if (is3d) loadModelViewer();
  }, [is3d]);

  // --- text element ---
  if (element.kind === 'text') {
    if (!element.text?.trim()) return null;
    return (
      <div className="text-sm leading-relaxed text-brand-dark">
        <MaybeLink link={element.link}>
          <p>{element.text}</p>
        </MaybeLink>
        {element.description ? (
          <p className="mt-1 text-xs text-gray-500">{element.description}</p>
        ) : null}
      </div>
    );
  }

  // --- media elements (image | video | 3d) ---
  const url = element.media?.url;
  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[DynamicBlocks] element ${element.id} (${element.kind}) has no media.url — skipped`,
      );
    }
    return null;
  }

  let media: React.ReactNode = null;

  if (element.kind === 'image') {
    media = (
      <div className="relative w-full aspect-square overflow-hidden rounded-md border border-border-base bg-white">
        <Image
          src={imgError ? productPlaceholder : url}
          alt={element.media?.alt ?? element.description ?? ''}
          fill
          className="object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  } else if (element.kind === 'video') {
    const ytId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);
    media = (
      <div className="relative w-full aspect-video overflow-hidden rounded-md bg-black">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0`}
            title={element.media?.alt || element.description || 'Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : vimeoId ? (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            title={element.media?.alt || element.description || 'Video'}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <video
            src={url}
            controls
            className="absolute inset-0 w-full h-full object-contain"
          >
            Your browser does not support video playback.
          </video>
        )}
      </div>
    );
  } else if (element.kind === '3d') {
    media = (
      <div className="relative w-full aspect-square overflow-hidden rounded-md bg-gradient-to-b from-gray-100 to-gray-200">
        {/* @ts-ignore - model-viewer is a web component */}
        <model-viewer
          src={url}
          alt={element.media?.alt || element.description || '3D Model'}
          auto-rotate
          camera-controls
          shadow-intensity="1"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  if (!media) return null;

  return (
    <figure className="flex flex-col">
      {/* Images/videos may be link-wrapped; 3d viewer needs pointer events so don't wrap it */}
      {element.kind === '3d' ? (
        media
      ) : (
        <MaybeLink link={element.link}>{media}</MaybeLink>
      )}
      {element.description ? (
        <figcaption className="mt-2 text-xs text-gray-600">
          {element.description}
        </figcaption>
      ) : null}
    </figure>
  );
};

export default BlockElementView;
