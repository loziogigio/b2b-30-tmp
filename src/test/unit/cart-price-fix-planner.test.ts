import { describe, it, expect, vi } from 'vitest';

const patchCartLines = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const removeCartLines = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const addCartLine = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const postCartLine = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('@framework/cart/b2b-cart', async (orig) => ({
  ...(await orig<typeof import('@framework/cart/b2b-cart')>()),
  patchCartLines,
  removeCartLines,
  addCartLine,
  postCartLine,
}));

import {
  applyCartFixPlan,
  planPriceFixes,
  CartFixError,
} from '@/lib/cart/price-fix-planner';
import { mapCSLineItemToItem } from '@utils/adapter/cart-adapter';
import type { ErpPriceData, PromoOffer } from '@utils/transform/erp-prices';

const NOW = new Date('2026-09-23T10:00:00Z');

const offer = (over: Partial<PromoOffer> = {}): PromoOffer =>
  ({
    promo_code: 'A',
    promo_row: 1,
    promo_title: '',
    promo_type: '',
    promo_qty_required: 1,
    promo_packaging_required: 0,
    promo_qty_per_packaging: 0,
    promo_min_pieces: 0,
    promo_min_value: 0,
    promo_net_price: 3.95,
    promo_ref_list_price: 0,
    promo_standard_price: 0,
    promo_start_date: '',
    promo_end_date: '',
    promo_extra_discounts: [],
    promo_gift_qty: 0,
    ...over,
  }) as PromoOffer;

const priceData = (
  net: number,
  offers: PromoOffer[] = [],
  over: Partial<ErpPriceData> = {},
  step = 1,
): ErpPriceData =>
  ({
    entity_code: 'E1',
    net_price: net,
    gross_price: 20,
    price: 20,
    price_discount: net,
    vat_percent: 22,
    availability: 5,
    discount: [],
    discount_description: '',
    packaging_option_default: {
      packaging_code: 'CFZ',
      qty_x_packaging: step,
    } as any,
    packaging_option_smallest: {
      packaging_code: 'CFZ',
      qty_x_packaging: step,
    } as any,
    packaging_options_all: [],
    all_promo_offers: offers,
    ...over,
  }) as ErpPriceData;

const line = (o: Record<string, any> = {}) =>
  mapCSLineItemToItem({
    line_number: 10,
    entity_code: 'E1',
    sku: 'S-1',
    name: 'Articolo',
    quantity: 12,
    unit_price: 7.18,
    list_price: 20,
    vat_rate: 22,
    product_source: 'pim',
    discounts: [],
    ...o,
  });

const promoLine = (o: Record<string, any> = {}) =>
  line({
    line_number: 20,
    unit_price: 3.95,
    promo_code: 'A',
    promo_row: 1,
    quantity: 12,
    note: 'urgente',
    ...o,
  });

describe('planPriceFixes', () => {
  it('patches the price of a line whose price moved', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 10, IsPrezzoVariato: true }],
      [line()],
      { E1: priceData(7.5) },
      NOW,
    );
    expect(plan).toEqual({
      ops: [
        {
          type: 'patch',
          patches: [{ line_number: 10, unit_price: 7.5, list_price: 20 }],
          from: {},
        },
      ],
      unfixable: [],
    });
  });

  it('turns an expired promo line into a listino line with the same quantity and note', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine()],
      { E1: priceData(7.18) },
      NOW,
    );
    expect(plan.ops[0]).toEqual({
      type: 'remove',
      lineNumbers: [20],
      restore: {},
    });
    expect(plan.ops[1]).toMatchObject({
      type: 'add',
      input: {
        item_id: 'E1',
        quantity: 12,
        price_discount: 7.18,
        promo_code: 0,
        promo_row: 0,
        note: 'urgente',
      },
    });
    expect(plan.ops).toHaveLength(2);
  });

  it('moves an expired promo quantity onto the existing listino line', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [line({ quantity: 5 }), promoLine()],
      { E1: priceData(7.18) },
      NOW,
    );
    expect(plan.ops).toEqual([
      { type: 'remove', lineNumbers: [20], restore: {} },
      {
        type: 'patch',
        patches: [{ line_number: 10, quantity: 17 }],
        from: { 10: [20] },
      },
    ]);
  });

  it('rounds a moved quantity up to the listino step', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine()],
      { E1: priceData(7.18, [], {}, 5) },
      NOW,
    );
    expect(plan.ops[1]).toMatchObject({ type: 'add', input: { quantity: 15 } });
  });

  it('keeps a fractional packaging step instead of rounding it up to 1', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine({ quantity: 0.375 })],
      { E1: priceData(7.18, [], {}, 0.125) },
      NOW,
    );
    expect(plan.ops[1]).toMatchObject({
      type: 'add',
      input: { quantity: 0.375 },
    });
  });

  it('keeps a step above 1 exact instead of forcing it to a whole multiple', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine({ quantity: 1.5 })],
      { E1: priceData(7.18, [], {}, 0.75) },
      NOW,
    );
    expect(plan.ops[1]).toMatchObject({
      type: 'add',
      input: { quantity: 1.5 },
    });
  });

  it('merges a moved fractional quantity onto an existing listino line exactly', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [line({ quantity: 0.5 }), promoLine({ quantity: 0.375 })],
      { E1: priceData(7.18, [], {}, 0.125) },
      NOW,
    );
    expect(plan.ops[1]).toEqual({
      type: 'patch',
      patches: [{ line_number: 10, quantity: 0.875 }],
      from: { 10: [20] },
    });
  });

  it('lands two expired promo lines of one product on ONE listino line', () => {
    const plan = planPriceFixes(
      [
        { IdRiga: 20, IsPromozioneScaduta: true },
        { IdRiga: 30, IsPromozioneScaduta: true },
      ],
      [
        promoLine(),
        promoLine({ line_number: 30, promo_code: 'B', quantity: 3, note: '' }),
      ],
      { E1: priceData(7.18) },
      NOW,
    );
    const adds = plan.ops.filter((op) => op.type === 'add');
    expect(adds).toHaveLength(1);
    expect(adds[0]).toMatchObject({ input: { quantity: 15 } });
  });

  it('re-adds a listino line whose discounts changed, merged with a moved promo quantity', () => {
    const plan = planPriceFixes(
      [
        { IdRiga: 10, IsScontiVariati: true },
        { IdRiga: 20, IsPromozioneScaduta: true },
      ],
      [line({ quantity: 5 }), promoLine()],
      { E1: priceData(7.18, [], { discount: [10] }) },
      NOW,
    );
    expect(plan.ops[0]).toEqual({
      type: 'remove',
      lineNumbers: [10, 20],
      restore: {},
    });
    const adds = plan.ops.filter((op) => op.type === 'add');
    expect(adds).toHaveLength(1);
    expect(adds[0]).toMatchObject({ input: { quantity: 17, discount1: 10 } });
  });

  it('converts a promo the server gate declared expired even if the storefront still offers it', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine()],
      { E1: priceData(7.18, [offer()]) },
      NOW,
    );
    expect(plan.ops[0]).toEqual({
      type: 'remove',
      lineNumbers: [20],
      restore: {},
    });
    expect(plan.ops[1]).toMatchObject({
      type: 'add',
      input: { promo_code: 0 },
    });
  });

  it('re-adds a promo line whose promo discount changed, keeping its promo', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsScontiVariati: true }],
      [promoLine()],
      { E1: priceData(7.18, [offer({ promo_extra_discounts: [-5] })]) },
      NOW,
    );
    expect(plan.ops[0]).toEqual({
      type: 'remove',
      lineNumbers: [20],
      restore: {},
    });
    expect(plan.ops[1]).toMatchObject({
      type: 'add',
      input: { promo_code: 'A', promo_row: 1, quantity: 12, note: 'urgente' },
    });
  });

  it('leaves a no-longer-sellable line to the customer', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 10, IsArticoloNonVendibile: true }],
      [line()],
      {},
      NOW,
    );
    expect(plan).toEqual({ ops: [], unfixable: [10] });
  });

  it('leaves an expired promo alone when the product has no bookable listino', () => {
    const plan = planPriceFixes(
      [{ IdRiga: 20, IsPromozioneScaduta: true }],
      [promoLine()],
      { E1: priceData(0) },
      NOW,
    );
    expect(plan).toEqual({ ops: [], unfixable: [20] });
  });

  it('leaves a moved quantity alone when its only listino line is itself unfixable', () => {
    const plan = planPriceFixes(
      [
        { IdRiga: 10, IsArticoloNonVendibile: true },
        { IdRiga: 20, IsPromozioneScaduta: true },
      ],
      [line(), promoLine()],
      { E1: priceData(7.18) },
      NOW,
    );
    expect(plan).toEqual({ ops: [], unfixable: [10, 20] });
  });
});

describe('applyCartFixPlan', () => {
  it('runs removals, then patches, then adds, and never touches postCartLine on the happy path', async () => {
    const calls: string[] = [];
    removeCartLines.mockImplementation(async () => calls.push('remove'));
    patchCartLines.mockImplementation(async () => calls.push('patch'));
    addCartLine.mockImplementation(async () => calls.push('add'));

    await applyCartFixPlan('O1', {
      ops: [
        {
          type: 'remove',
          lineNumbers: [20],
          restore: { 20: { entity_code: 'E1', quantity: 12 } },
        },
        {
          type: 'patch',
          patches: [{ line_number: 10, quantity: 17 }],
          from: { 10: [20] },
        },
        {
          type: 'add',
          input: { item_id: 'E1', quantity: 1 },
          sourceItem: line(),
          from: [],
        },
      ],
      unfixable: [],
    });

    expect(calls).toEqual(['remove', 'patch', 'add']);
    expect(removeCartLines).toHaveBeenCalledWith('O1', { line_numbers: [20] });
    expect(patchCartLines).toHaveBeenCalledWith('O1', [
      { line_number: 10, quantity: 17 },
    ]);
    expect(postCartLine).not.toHaveBeenCalled();
  });

  it('restores a moved line when its target patch line fails, then throws CartFixError', async () => {
    removeCartLines.mockResolvedValue({});
    patchCartLines.mockResolvedValue({
      results: [{ line_number: 10, success: false }],
    });
    postCartLine.mockResolvedValue({});

    const plan = {
      ops: [
        {
          type: 'remove' as const,
          lineNumbers: [20],
          restore: { 20: { entity_code: 'E1', quantity: 12 } },
        },
        {
          type: 'patch' as const,
          patches: [{ line_number: 10, quantity: 17 }],
          from: { 10: [20] },
        },
      ],
      unfixable: [],
    };

    const err: any = await applyCartFixPlan('O1', plan).catch((e) => e);
    expect(err).toBeInstanceOf(CartFixError);
    expect(err.message).toBe('Aggiornamento non completato');
    expect(err.restored).toEqual([20]);
    expect(err.lost).toEqual([]);
    expect(postCartLine).toHaveBeenCalledWith('O1', {
      entity_code: 'E1',
      quantity: 12,
    });
  });

  it("restores an add's source lines when the add itself fails, and still runs the rest of the plan", async () => {
    removeCartLines.mockResolvedValue({});
    addCartLine.mockRejectedValueOnce(new Error('network'));
    addCartLine.mockResolvedValueOnce({});
    postCartLine.mockResolvedValue({});

    const plan = {
      ops: [
        {
          type: 'remove' as const,
          lineNumbers: [30],
          restore: { 30: { entity_code: 'E2', quantity: 3 } },
        },
        {
          type: 'add' as const,
          input: { item_id: 'E2', quantity: 3 },
          sourceItem: line(),
          from: [30],
        },
        {
          type: 'add' as const,
          input: { item_id: 'E3', quantity: 1 },
          sourceItem: line(),
          from: [40],
        },
      ],
      unfixable: [],
    };

    const err: any = await applyCartFixPlan('O1', plan).catch((e) => e);
    expect(err).toBeInstanceOf(CartFixError);
    expect(err.restored).toEqual([30]);
    expect(err.lost).toEqual([]);
    expect(addCartLine).toHaveBeenCalledTimes(2);
    expect(postCartLine).toHaveBeenCalledWith('O1', {
      entity_code: 'E2',
      quantity: 3,
    });
  });

  it('lists a line as lost when its own restore re-post fails', async () => {
    removeCartLines.mockResolvedValue({});
    patchCartLines.mockResolvedValue({
      results: [{ line_number: 10, success: false }],
    });
    postCartLine.mockRejectedValue(new Error('boom'));

    const plan = {
      ops: [
        {
          type: 'remove' as const,
          lineNumbers: [20],
          restore: { 20: { entity_code: 'E1', quantity: 12 } },
        },
        {
          type: 'patch' as const,
          patches: [{ line_number: 10, quantity: 17 }],
          from: { 10: [20] },
        },
      ],
      unfixable: [],
    };

    const err: any = await applyCartFixPlan('O1', plan).catch((e) => e);
    expect(err).toBeInstanceOf(CartFixError);
    expect(err.restored).toEqual([]);
    expect(err.lost).toEqual([20]);
  });
});
