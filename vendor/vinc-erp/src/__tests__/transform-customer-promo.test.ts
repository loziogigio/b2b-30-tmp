import { describe, it, expect } from 'vitest';
import { buildCustomerPromo } from '../mymb/transform';

// Captured live: GetTestatePromoPerCliente, customer 10407, address 1.
const ROW = {
  CodiceCanaleDiDestinazione: '',
  CodicePromozione: '26-SETTEMBRE',
  CodicePromozionePadre: '26-SETTEMBRE',
  CodiceTipoTipologiaPromozione: 'STD',
  DataInizioValidita: '07/09/2026',
  DataScadenza: '03/10/2026',
  DescrizionePromo: 'CANVASS SETTEMBRE',
  DescrizionePromozionePadre: 'CANVASS SETTEMBRE',
  DescrizioneTipoTipologiaPromozione: 'Standard',
  NotePromo: null,
};

describe('buildCustomerPromo', () => {
  it('maps a captured ListaPromo row', () => {
    expect(buildCustomerPromo(ROW)).toEqual({
      code: '26-SETTEMBRE',
      parentCode: '26-SETTEMBRE',
      label: 'CANVASS SETTEMBRE',
      type: 'STD',
      from: '07/09/2026',
      to: '03/10/2026',
    });
  });

  it('coerces missing/null fields to empty strings, never undefined', () => {
    // IMPMIN comes back with CodiceTipoTipologiaPromozione '0' and NotePromo null.
    const promo = buildCustomerPromo({
      CodicePromozione: 'IMPMIN',
      CodiceTipoTipologiaPromozione: '0',
      DescrizionePromo: 'MINIMO ORDINE',
    });
    expect(promo).toEqual({
      code: 'IMPMIN',
      parentCode: '',
      label: 'MINIMO ORDINE',
      type: '0',
      from: '',
      to: '',
    });
  });

  it('trims codes so a padded code still matches a Solr bucket', () => {
    expect(buildCustomerPromo({ CodicePromozione: ' 26-PUGLIA ' }).code).toBe(
      '26-PUGLIA',
    );
  });
});
