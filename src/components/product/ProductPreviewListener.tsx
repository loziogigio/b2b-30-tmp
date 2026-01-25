'use client';

import { useEffect, useState } from 'react';
import type { PageBlock } from '@/lib/types/blocks';

interface PreviewState {
  blocks: PageBlock[];
  isDirty?: boolean;
}

interface PreviewMessage {
  type: 'PREVIEW_UPDATE';
  blocks: PageBlock[];
  productId?: string;
  timestamp: number;
  isDirty?: boolean;
}

interface ProductPreviewListenerProps {
  children: (state: PreviewState | null) => React.ReactNode;
  allowedOrigins?: string[];
  currentProductId?: string;
}

const PREVIEW_STORAGE_KEY = 'vinc_preview_blocks';
const PREVIEW_TIMESTAMP_KEY = 'vinc_preview_timestamp';
const PREVIEW_DIRTY_KEY = 'vinc_preview_dirty';
const PREVIEW_PRODUCT_KEY = 'vinc_preview_product';
const PREVIEW_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

const isWildcardProduct = (value: string | null | undefined) =>
  !value || value === 'default';

/**
 * Client component that listens for preview blocks via postMessage
 * Falls back to sessionStorage if page refreshes during preview
 * Then falls back to server-provided blocks if no preview data available
 */

// Trusted builder origins (always allowed regardless of env)
const TRUSTED_BUILDER_ORIGINS = [
  'https://cs.vendereincloud.it',
  'https://pim.vendereincloud.it',
];

const resolveAllowedOrigins = (): string[] => {
  const origins: string[] = [...TRUSTED_BUILDER_ORIGINS];

  const envOrigin =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_B2B_BUILDER_URL ||
        process.env.NEXT_PUBLIC_BUILDER_ORIGIN
      : undefined;

  if (envOrigin) {
    try {
      origins.push(new URL(envOrigin).origin);
    } catch {
      origins.push(envOrigin.replace(/\/$/, ''));
    }
  }

  // Add localhost for development
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3001');
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3001');
    origins.push('http://127.0.0.1:3000');
  }

  return [...new Set(origins)]; // Remove duplicates
};

export function ProductPreviewListener({
  children,
  allowedOrigins = resolveAllowedOrigins(),
  currentProductId,
}: ProductPreviewListenerProps) {
  const [previewState, setPreviewState] = useState<PreviewState | null>(() => {
    // On mount, try to restore preview from sessionStorage (handles refresh during editing)
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      const timestamp = sessionStorage.getItem(PREVIEW_TIMESTAMP_KEY);
      const dirtyFlag = sessionStorage.getItem(PREVIEW_DIRTY_KEY);
      const storedProduct = sessionStorage.getItem(PREVIEW_PRODUCT_KEY);

      const clearStoredPreview = () => {
        sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
        sessionStorage.removeItem(PREVIEW_TIMESTAMP_KEY);
        sessionStorage.removeItem(PREVIEW_DIRTY_KEY);
        sessionStorage.removeItem(PREVIEW_PRODUCT_KEY);
      };

      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < PREVIEW_EXPIRY_MS) {
          if (
            currentProductId &&
            storedProduct &&
            !isWildcardProduct(storedProduct) &&
            storedProduct !== currentProductId
          ) {
            clearStoredPreview();
            return null;
          }
          const parsed = JSON.parse(stored) as PageBlock[] | PreviewState;
          const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
          if (Array.isArray(blocks)) {
            const isDirty = dirtyFlag == null ? undefined : dirtyFlag === '1';
            console.log(
              '[Preview] Restored from sessionStorage:',
              blocks.length,
              'blocks',
            );
            return { blocks, isDirty };
          }
        } else {
          // Expired, clear it
          clearStoredPreview();
        }
      }
    } catch (error) {
      console.warn('[Preview] Failed to restore from sessionStorage:', error);
    }

    return null;
  });

  useEffect(() => {
    const clearStoredPreview = () => {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      sessionStorage.removeItem(PREVIEW_TIMESTAMP_KEY);
      sessionStorage.removeItem(PREVIEW_DIRTY_KEY);
      sessionStorage.removeItem(PREVIEW_PRODUCT_KEY);
    };

    const handleMessage = (event: MessageEvent) => {
      // Only process PREVIEW_UPDATE messages to avoid noise from other postMessages
      const data = event.data as PreviewMessage;
      if (data?.type !== 'PREVIEW_UPDATE') {
        return;
      }

      // Check if origin is in the allowed list
      const isAllowedOrigin = allowedOrigins.includes(event.origin);

      if (!isAllowedOrigin) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[ProductPreviewListener] ❌ Origin rejected. Allowed:',
            allowedOrigins,
            'Got:',
            event.origin,
          );
        }
        return;
      }

      console.log(
        '[ProductPreviewListener] ✅ PREVIEW_UPDATE received from:',
        event.origin,
      );
      console.log(
        '[ProductPreviewListener] - Blocks:',
        data.blocks?.length,
        '| isDirty:',
        data.isDirty,
        '| productId:',
        data.productId,
      );

      if (Array.isArray(data.blocks)) {
        if (
          currentProductId &&
          data.productId &&
          data.productId !== 'default' &&
          data.productId !== currentProductId
        ) {
          return; // Product mismatch - silently ignore
        }

        const dirtyState = data.isDirty ?? true;
        setPreviewState({ blocks: data.blocks, isDirty: dirtyState });

        // Persist to sessionStorage ONLY if dirty (unsaved changes)
        // If not dirty (saved), clear sessionStorage to avoid stale data
        try {
          if (dirtyState) {
            // Has unsaved changes - persist to sessionStorage for refresh recovery
            sessionStorage.setItem(
              PREVIEW_STORAGE_KEY,
              JSON.stringify(data.blocks),
            );
            sessionStorage.setItem(
              PREVIEW_TIMESTAMP_KEY,
              Date.now().toString(),
            );
            sessionStorage.setItem(PREVIEW_DIRTY_KEY, '1');
            const productKey = !isWildcardProduct(data.productId)
              ? data.productId
              : currentProductId || data.productId || 'default';
            if (productKey) {
              sessionStorage.setItem(PREVIEW_PRODUCT_KEY, productKey);
            } else {
              sessionStorage.removeItem(PREVIEW_PRODUCT_KEY);
            }
          } else {
            // Saved version - clear sessionStorage so next reload uses server blocks
            clearStoredPreview();
          }
        } catch {
          // Silently ignore sessionStorage errors
        }
      }
    };

    // Listen for messages from parent window (builder)
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearStoredPreview();
    };
  }, [allowedOrigins, currentProductId]);

  return <>{children(previewState)}</>;
}
