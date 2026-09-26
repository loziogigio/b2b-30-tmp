/**
 * The compare list lives in the browser, so it also keeps how each compared
 * product looked: a product the catalog drops can still show its name and
 * photo, greyed out.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useCompareSnapshots,
  type ShownCompareProduct,
} from '@/contexts/compare/use-compare-snapshots';

const STORAGE_KEY = 'vinc-compare-products';

const drill: ShownCompareProduct = {
  sku: 'LIVE-1',
  snapshot: { name: { it: 'Trapano' }, image_url: 'https://cdn.test/t.jpg' },
};

function saved() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCompareSnapshots', () => {
  it('remembers the products the comparison shows', () => {
    const { result } = renderHook(() =>
      useCompareSnapshots(['LIVE-1'], [drill]),
    );

    expect(result.current).toEqual({ 'LIVE-1': drill.snapshot });
    expect(saved()).toEqual({ 'LIVE-1': drill.snapshot });
  });

  it('keeps the snapshot of a listed product the search no longer returns', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'GONE-1': { name: { it: 'Levigatrice' } } }),
    );

    const { result } = renderHook(() =>
      useCompareSnapshots(['LIVE-1', 'GONE-1'], [drill]),
    );

    expect(result.current['GONE-1']).toEqual({ name: { it: 'Levigatrice' } });
  });

  it('forgets products no longer in the list', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'REMOVED-1': { name: { it: 'Vecchio' } } }),
    );

    renderHook(() => useCompareSnapshots(['LIVE-1'], [drill]));

    expect(saved()).toEqual({ 'LIVE-1': drill.snapshot });
  });

  it('touches nothing while the list is still empty (not loaded yet)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'GONE-1': { name: { it: 'Levigatrice' } } }),
    );

    const { result } = renderHook(() => useCompareSnapshots([], []));

    expect(result.current).toEqual({});
    expect(saved()).toEqual({ 'GONE-1': { name: { it: 'Levigatrice' } } });
  });

  it('writes storage only when the snapshots change', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const skus = ['LIVE-1'];
    const { rerender } = renderHook(
      ({ shown }) => useCompareSnapshots(skus, shown),
      { initialProps: { shown: [drill] } },
    );

    // Same content, new array: nothing to write.
    rerender({ shown: [{ ...drill }] });

    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() =>
      useCompareSnapshots(['LIVE-1'], [drill]),
    );

    expect(result.current).toEqual({ 'LIVE-1': drill.snapshot });
  });
});
