'use client';

import type { ComponentProps } from 'react';
import SearchOverlayB2B from '@/components/search/search-overlay-b2b';
import TimeSearchBox from '@/components/themes/time/layout/widgets/time-search-box';

// Time theme search overlay: reuses the shared overlay (recent searches, live
// results, navigation) but swaps in the DFL-styled search box so the overlay
// field matches the header field.
export default function TimeSearchOverlay(
  props: ComponentProps<typeof SearchOverlayB2B>,
) {
  return <SearchOverlayB2B {...props} SearchBoxComponent={TimeSearchBox} />;
}
