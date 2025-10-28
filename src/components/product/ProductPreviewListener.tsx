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
  allowedOrigin?: string;
  currentProductId?: string;
}

const PREVIEW_STORAGE_KEY = 'hidros_preview_blocks';
const PREVIEW_TIMESTAMP_KEY = 'hidros_preview_timestamp';
const PREVIEW_DIRTY_KEY = 'hidros_preview_dirty';
const PREVIEW_PRODUCT_KEY = 'hidros_preview_product';
const PREVIEW_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

const isWildcardProduct = (value: string | null | undefined) => !value || value === 'default';

/**
 * Client component that listens for preview blocks via postMessage
 * Falls back to sessionStorage if page refreshes during preview
 * Then falls back to server-provided blocks if no preview data available
 */
const resolveAllowedOrigin = () => {
  const envOrigin =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_B2B_BUILDER_URL || process.env.NEXT_PUBLIC_BUILDER_ORIGIN
      : undefined;
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin;
    } catch {
      return envOrigin.replace(/\/$/, '');
    }
  }
  return 'http://localhost:3001';
};

export function ProductPreviewListener({
  children,
  allowedOrigin = resolveAllowedOrigin(),
  currentProductId
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
            console.log('[Preview] Restored from sessionStorage:', blocks.length, 'blocks');
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
      console.log('[ProductPreviewListener] Message received from origin:', event.origin);

      // Security: Verify origin
      if (event.origin !== allowedOrigin) {
        console.warn('[ProductPreviewListener] ❌ Origin rejected. Expected:', allowedOrigin, 'Got:', event.origin);
        return;
      }

      console.log('[ProductPreviewListener] ✅ Origin verified. Message type:', event.data?.type);

      // Check if this is a preview update message
      const data = event.data as PreviewMessage;
      if (data.type === 'PREVIEW_UPDATE' && Array.isArray(data.blocks)) {
        console.log('[ProductPreviewListener] PREVIEW_UPDATE message received');
        console.log('[ProductPreviewListener] - Blocks count:', data.blocks.length);
        console.log('[ProductPreviewListener] - isDirty:', data.isDirty);
        console.log('[ProductPreviewListener] - productId:', data.productId);
        console.log('[ProductPreviewListener] - currentProductId:', currentProductId);

        if (
          currentProductId &&
          data.productId &&
          data.productId !== 'default' &&
          data.productId !== currentProductId
        ) {
          console.warn('[ProductPreviewListener] ❌ Product mismatch. Expected:', currentProductId, 'Got:', data.productId);
          return;
        }

        console.log('[ProductPreviewListener] ✅ Received blocks via postMessage:', data.blocks.length);
        if (data.blocks.length > 0) {
          console.log('[ProductPreviewListener] First block type:', data.blocks[0].type);
          console.log('[ProductPreviewListener] First block config keys:', Object.keys(data.blocks[0].config || {}));
        }

        const dirtyState = data.isDirty ?? true;
        console.log('[ProductPreviewListener] Setting preview state with isDirty:', dirtyState);
        setPreviewState({ blocks: data.blocks, isDirty: dirtyState });

        // Persist to sessionStorage ONLY if dirty (unsaved changes)
        // If not dirty (saved), clear sessionStorage to avoid stale data
        try {
          if (dirtyState) {
            // Has unsaved changes - persist to sessionStorage for refresh recovery
            sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(data.blocks));
            sessionStorage.setItem(PREVIEW_TIMESTAMP_KEY, Date.now().toString());
            sessionStorage.setItem(PREVIEW_DIRTY_KEY, '1');
            const productKey = !isWildcardProduct(data.productId)
              ? data.productId
              : currentProductId || data.productId || 'default';
            if (productKey) {
              sessionStorage.setItem(PREVIEW_PRODUCT_KEY, productKey);
            } else {
              sessionStorage.removeItem(PREVIEW_PRODUCT_KEY);
            }
            console.log('[ProductPreviewListener] ✅ Persisted unsaved blocks to sessionStorage');
          } else {
            // Saved version - clear sessionStorage so next reload uses server blocks
            clearStoredPreview();
            console.log('[ProductPreviewListener] ✅ Cleared sessionStorage (blocks are saved)');
          }
        } catch (error) {
          console.warn('[ProductPreviewListener] ❌ Failed to update sessionStorage:', error);
        }
      } else {
        console.log('[ProductPreviewListener] Ignoring message - not PREVIEW_UPDATE or invalid blocks');
      }
    };

    // Listen for messages from parent window (builder)
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearStoredPreview();
    };
  }, [allowedOrigin, currentProductId]);

  return <>{children(previewState)}</>;
}
