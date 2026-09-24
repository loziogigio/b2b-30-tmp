import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const cart = vi.hoisted(() => ({
  items: [] as any[],
  meta: { orderId: 'O1', priceDecimals: 2 } as any,
  hydrateFromServer: vi.fn(),
  setCartSummary: vi.fn(),
}));
vi.mock('@contexts/cart/cart.context', () => ({ useCart: () => cart }));
const settings = vi.hoisted(() => ({ verifyPrices: true }));
vi.mock('@/hooks/use-cart-settings', () => ({
  useCartSettings: () => ({ settings, isLoading: false }),
}));
const source = vi.hoisted(() => ({ value: 'inline' }));
vi.mock('@framework/pricing', async (orig) => ({
  ...(await orig<typeof import('@framework/pricing')>()),
  usePricingSource: () => source.value,
}));
const fetchCartPriceMap = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cart/fetch-cart-price-map', () => ({ fetchCartPriceMap }));
const fetchCartData = vi.hoisted(() => vi.fn());
vi.mock('@framework/cart/b2b-cart', async (orig) => ({
  ...(await orig<typeof import('@framework/cart/b2b-cart')>()),
  fetchCartData,
}));
const applyCartFixPlan = vi.hoisted(() => vi.fn());
const planPriceFixes = vi.hoisted(() =>
  vi.fn((): CartFixPlan => ({ ops: [], unfixable: [] })),
);
vi.mock('@/lib/cart/price-fix-planner', async (orig) => ({
  ...(await orig<typeof import('@/lib/cart/price-fix-planner')>()),
  applyCartFixPlan,
  planPriceFixes,
}));

import {
  CartAnomaliesProvider,
  useCartAnomalies,
} from '@/contexts/cart-anomalies.context';
import {
  CartPriceCheckProvider,
  useCartPriceCheck,
} from '@/contexts/cart-price-check.context';
import { CartFixError, type CartFixPlan } from '@/lib/cart/price-fix-planner';
import { mapCSLineItemToItem } from '@utils/adapter/cart-adapter';

const staleLine = () =>
  mapCSLineItemToItem({
    line_number: 10,
    entity_code: 'E1',
    sku: 'S-1',
    quantity: 2,
    unit_price: 7.18,
    list_price: 20,
    vat_rate: 22,
    product_source: 'pim',
    discounts: [],
  });

let api: ReturnType<typeof useCartPriceCheck>;
function Probe() {
  api = useCartPriceCheck();
  const { result } = useCartAnomalies();
  return (
    <div data-testid="state">{`${api.status}|${result?.source ?? 'none'}|${result?.anomalies.length ?? 0}`}</div>
  );
}
const renderProvider = () =>
  render(
    <CartAnomaliesProvider>
      <CartPriceCheckProvider>
        <Probe />
      </CartPriceCheckProvider>
    </CartAnomaliesProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  cart.items = [staleLine()];
  cart.meta = { orderId: 'O1', priceDecimals: 2 };
  settings.verifyPrices = true;
  source.value = 'inline';
  fetchCartPriceMap.mockResolvedValue({
    E1: {
      entity_code: 'E1',
      net_price: 7.5,
      gross_price: 20,
      price: 20,
      price_discount: 7.5,
      discount: [],
      all_promo_offers: [],
    },
  });
  fetchCartData.mockResolvedValue({ items: [], summary: { orderId: 'O1' } });
  applyCartFixPlan.mockResolvedValue(undefined);
});

describe('CartPriceCheckProvider', () => {
  it('checks the cart when it opens and publishes native anomalies', async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('changed|native|1'),
    );
    expect(fetchCartPriceMap).toHaveBeenCalledWith(['E1']);
  });

  it('stays idle when the switch is off', async () => {
    settings.verifyPrices = false;
    renderProvider();
    await act(async () => {});
    expect(fetchCartPriceMap).not.toHaveBeenCalled();
    expect(screen.getByTestId('state').textContent).toBe('idle|none|0');
  });

  it('stays idle when the storefront does not book inline prices', async () => {
    source.value = 'erp';
    renderProvider();
    await act(async () => {});
    expect(fetchCartPriceMap).not.toHaveBeenCalled();
  });

  it('fails open when the catalog cannot be reached', async () => {
    fetchCartPriceMap.mockRejectedValue(new Error('down'));
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe(
        'unavailable|none|0',
      ),
    );
  });

  it('fix applies the plan, reloads the cart and re-checks it', async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('changed|native|1'),
    );
    const result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [],
      source: 'native' as const,
    };
    await act(async () => {
      await api.fix(result);
    });
    expect(planPriceFixes).toHaveBeenCalledWith(
      result.anomalies,
      expect.any(Array),
      expect.any(Object),
      expect.any(Date),
      2,
    );
    expect(applyCartFixPlan).toHaveBeenCalledWith('O1', {
      ops: [],
      unfixable: [],
    });
    expect(cart.hydrateFromServer).toHaveBeenCalledWith([], 'replace');
    expect(screen.getByTestId('state').textContent).toBe('clean|none|0');
  });

  it('reports fixFailed and the lost line SKU when the plan cannot be fully applied', async () => {
    applyCartFixPlan.mockRejectedValue(new CartFixError([], [10], []));
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('changed|native|1'),
    );
    const result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [],
      source: 'native' as const,
    };
    await act(async () => {
      await api.fix(result);
    });
    expect(api.fixFailed).toBe(true);
    expect(api.fixLostSkus).toEqual(['S-1']);
    expect(api.fixing).toBe(false);
  });

  it('names the lines the plan could not fix, even when the re-check comes back clean', async () => {
    // A gate-only refusal the storefront cannot reproduce: the planner has
    // nothing to change, and the clean re-check must not hide it.
    planPriceFixes.mockReturnValueOnce({ ops: [], unfixable: [10] });
    cart.meta = { orderId: 'O1', priceDecimals: 3 };
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('changed|native|1'),
    );
    const result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [],
      source: 'native' as const,
    };
    let ok: boolean | undefined;
    await act(async () => {
      ok = await api.fix(result);
    });
    expect(planPriceFixes).toHaveBeenCalledWith(
      result.anomalies,
      expect.any(Array),
      expect.any(Object),
      expect.any(Date),
      3,
    );
    expect(ok).toBe(true);
    expect(screen.getByTestId('state').textContent).toBe('clean|none|0');
    expect(api.fixUnfixableSkus).toEqual(['S-1']);
    expect(api.fixFailed).toBe(false);
  });

  it('clears the lines it could not fix when the next fix starts', async () => {
    planPriceFixes.mockReturnValueOnce({ ops: [], unfixable: [10] });
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('changed|native|1'),
    );
    const result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [],
      source: 'native' as const,
    };
    await act(async () => {
      await api.fix(result);
    });
    expect(api.fixUnfixableSkus).toEqual(['S-1']);
    await act(async () => {
      await api.fix(result);
    });
    expect(api.fixUnfixableSkus).toEqual([]);
  });

  it('returns false and marks the fix as failed when there is no active order', async () => {
    cart.meta = { priceDecimals: 2 };
    renderProvider();
    await act(async () => {});
    const result = {
      anomalies: [{ IdRiga: 10, IsPrezzoVariato: true }],
      erpItems: [],
      source: 'native' as const,
    };
    let ok: boolean | undefined;
    await act(async () => {
      ok = await api.fix(result);
    });
    expect(ok).toBe(false);
    expect(api.fixFailed).toBe(true);
    expect(applyCartFixPlan).not.toHaveBeenCalled();
  });
});
