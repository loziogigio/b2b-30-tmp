import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const openModalMock = vi.fn();
const settingsMock = { productOpenMode: 'detail_page' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('@components/common/modal/modal.context', () => ({
  useModalAction: () => ({ openModal: openModalMock }),
}));
vi.mock('@/hooks/use-catalog-settings', () => ({
  useCatalogSettings: () => ({ settings: settingsMock }),
}));

import { useProductOpen } from '@/hooks/use-product-open';

beforeEach(() => {
  pushMock.mockClear();
  openModalMock.mockClear();
  settingsMock.productOpenMode = 'detail_page';
});

describe('useProductOpen', () => {
  it('opens a simple product at its localized flat slug', () => {
    const { result } = renderHook(() => useProductOpen('it'));

    act(() => {
      result.current(
        {
          sku: 'SKU-1',
          slug: { it: 'lampada-led', en: 'led-lamp' },
        },
        false,
      );
    });

    expect(pushMock).toHaveBeenCalledWith('/it/lampada-led');
    expect(openModalMock).not.toHaveBeenCalled();
  });

  it('uses a flat, encoded SKU when the locale has no slug', () => {
    const { result } = renderHook(() => useProductOpen('it'));

    act(() => {
      result.current({ sku: 'PO 27/011', slug: { en: 'led-lamp' } }, false);
    });

    expect(pushMock).toHaveBeenCalledWith('/it/PO%2027%2F011');
  });

  it('keeps multi-variant products in their chooser modal', () => {
    const { result } = renderHook(() => useProductOpen('it'));
    const product = { sku: 'SKU-1', slug: 'lampada-led' };

    act(() => result.current(product, true));

    expect(openModalMock).toHaveBeenCalledWith(
      'B2B_PRODUCT_VARIANTS_QUICK_VIEW',
      product,
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
