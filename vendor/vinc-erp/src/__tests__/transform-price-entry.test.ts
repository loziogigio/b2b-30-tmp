import { describe, it, expect } from 'vitest';
import { buildPriceEntry } from '../mymb/transform.js';
import type { MyMbErpSettings } from '../types/pricing.js';

const settings: MyMbErpSettings = {
  packagingOptionsId: [1],
  isManagedSubstitutes: false,
  isManagedSupplierOrder: false,
  cases: { '0': { label: 'OK', addToCart: true }, '5': { label: 'NO', addToCart: false } },
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

function rawPrice(overrides: Record<string, unknown> = {}) {
  return {
    CodiceInternoArticolo: 'ART1',
    IVAPercentuale: 22,
    QtaDisponibile: 10,
    Prezzo: 100,
    PrezzoNettoXVisualizzazione: 90,
    TipoListinoUtilizzato: 'L1',
    CodiceListinoUtilizzato: 'C1',
    ImballiArticolo: { ListaImballoXArticolo: [
      { IdImballo: 1, CodiceImballo1: 'PZ', QtaXImballo: 1, UM: 'PZ', DescrizioneUM: 'Pezzo',
        IsImballoDiDefaultXVendita: true, IsImballoPiuPiccolo: true },
    ]},
    ...overrides,
  };
}

describe('buildPriceEntry', () => {
  it('maps base (no improving promo) fields like the Python listino branch', () => {
    const e = buildPriceEntry(rawPrice(), settings);
    expect(e.entity_code).toBe('ART1');
    expect(e.vat_percent).toBe(22);
    expect(e.availability).toBe(10);
    expect(e.gross_price).toBe(100);
    expect(e.net_price).toBe(90);
    expect(e.price).toBe(100);
    expect(e.price_discount).toBe(90);
    expect(e.is_promo).toBe(false);
    expect(e.is_improving_promo).toBe(false);
    expect(e.pricelist_type).toBe('L1');
    expect(e.pricelist_code).toBe('C1');
    expect(e.packaging_option_default).toMatchObject({ packaging_code: 'PZ', packaging_id: 1 });
    expect(e.packaging_option_smallest).toMatchObject({ packaging_code: 'PZ', packaging_id: 1 });
    expect(e.packaging_options_all[0]).toMatchObject({ packaging_id: 1 });
    expect(e.packaging_options.length).toBe(1); // configured id 1 present
    expect(e.product_label_action.case).toBe(0);
    expect(e.improving_promo).toEqual({}); // raw passthrough default
  });

  it('applies the improving-promo branch when RigaPromozioneMigliorativa has a code', () => {
    const e = buildPriceEntry(rawPrice({
      RigaPromozioneMigliorativa: {
        CodicePromozione: 'P1',
        TipoPromozione: 'RigaPrezzoNettoQuantitaMinima',
        PrezzoNettoListinoDiRiferimento: 80,
        PrezzoNettoConPromo: 70,
        RigaPromozione: 2,
        TitoloPromozione: 'Deal',
        DataInizioValitita: '01/15/2026 12:00:00 AM',
        DataFineValidita: '02/15/2026 12:00:00 AM',
        ScontoExtra1: 5, ScontoExtra2: 0, ScontoExtra3: 0,
      },
    }), settings);
    expect(e.is_promo).toBe(true);
    expect(e.is_improving_promo).toBe(true);
    expect(e.is_improving_promo_net_price).toBe(true);
    expect(e.price).toBe(80);
    expect(e.price_discount).toBe(70);
    expect(e.promo_price).toBe(70);
    expect(e.promo_code).toBe('P1');
    expect(e.start_promo_date).toBe('15/01/26');
    expect(e.end_promo_date).toBe('15/02/26');
    expect(e.discount_extra).toEqual([5, 0, 0]);
  });

  it('passes through raw RighePromo as all_promo and counts it', () => {
    const e = buildPriceEntry(rawPrice({ RighePromo: { ListaPromo: [{ a: 1 }, { b: 2 }] } }), settings);
    expect(e.all_promo).toEqual({ ListaPromo: [{ a: 1 }, { b: 2 }] });
    expect(e.count_promo).toBe(0); // count_promo only counts when all_promo is itself a list (Python parity)
  });
});
