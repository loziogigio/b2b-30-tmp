import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  CartAnomaliesProvider,
  useCartAnomalies,
} from '@/contexts/cart-anomalies.context';
import type { AnomalyResult } from '@/hooks/use-order-submit';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(CartAnomaliesProvider, null, children);

const result = (source?: 'native'): AnomalyResult => ({
  anomalies: [{ IdRiga: 20, IsPromozioneScaduta: true }],
  erpItems: [{ erp_line_number: 20, erp_data: { oarti: 'E1' } }],
  source,
});

describe('cart anomalies — row matching', () => {
  it('matches native anomalies by line only (a product can have a listino and a promo line)', () => {
    const { result: ctx } = renderHook(() => useCartAnomalies(), { wrapper });
    act(() => ctx.current.setAnomalies(result('native')));
    expect(ctx.current.byEntityCode).toEqual({});
    expect(ctx.current.byIdRiga[20]).toEqual(['Promozione scaduta']);
  });

  it('keeps entity-code matching for ERP anomalies', () => {
    const { result: ctx } = renderHook(() => useCartAnomalies(), { wrapper });
    act(() => ctx.current.setAnomalies(result()));
    expect(ctx.current.byEntityCode.E1).toEqual(['Promozione scaduta']);
  });
});
