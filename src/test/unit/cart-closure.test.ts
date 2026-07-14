import { describe, it, expect } from 'vitest';
import { buildCartClosureInfo } from 'vinc-erp';

/**
 * Shape of GetInfoTestataOrdineXControlloChiusuraResult, per the legacy
 * looxb2b_ordine_minimo_spese_trasporto() mapping: TotaliDocumento is
 * positional — [0] netto, [8] iva, [9] totale documento, [10] lordo.
 */
const raw = (over: Record<string, unknown> = {}) => ({
  ReturnCode: 0,
  IsTotaleDocumentoConforme: false,
  ImportoMinimoOrdine: 1200,
  ImportoMinimoOrdinePerSpeseTrasportoAZero: 1500,
  TotaleSpeseDiTrasporto: 15,
  TotaliDocumento: [860, 1, 2, 3, 4, 5, 6, 7, 189.2, 1049.2, 1000],
  CodiceGiroDiConsegna: 'G1',
  CodicePuntoVendita: 'PV1',
  CodiceTrasporto: 'T1',
  DataSpedizione: '15/07/2026',
  ...over,
});

describe('buildCartClosureInfo', () => {
  it('maps the ERP minimum-order rule (IMPMIN)', () => {
    const info = buildCartClosureInfo(raw());
    expect(info.minimumAmount).toBe(1200);
    expect(info.freeShippingAbove).toBe(1500);
    expect(info.transportCost).toBe(15);
    expect(info.compliant).toBe(false);
  });

  it('reads TotaliDocumento by its positional contract', () => {
    const info = buildCartClosureInfo(raw());
    expect(info.totalNet).toBe(860); // [0]
    expect(info.vat).toBe(189.2); // [8]
    expect(info.totalDoc).toBe(1049.2); // [9]
    expect(info.totalGross).toBe(1000); // [10]
  });

  it('treats an unknown/empty ERP cart as NO minimum, not as compliant', () => {
    // The ERP answers ReturnCode 0 with all-zeros for a cart it does not know.
    // A 0 minimum must mean "none configured" — never a reason to block.
    const info = buildCartClosureInfo(
      raw({
        ImportoMinimoOrdine: 0,
        IsTotaleDocumentoConforme: true,
        TotaliDocumento: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }),
    );
    expect(info.minimumAmount).toBe(0);
    expect(info.totalNet).toBe(0);
  });

  it('survives a missing/short TotaliDocumento without throwing', () => {
    const info = buildCartClosureInfo(raw({ TotaliDocumento: undefined }));
    expect(info.totalNet).toBe(0);
    expect(info.totalGross).toBe(0);
    expect(info.minimumAmount).toBe(1200);
  });

  it('coerces non-numeric ERP values to 0 rather than NaN', () => {
    const info = buildCartClosureInfo(
      raw({ ImportoMinimoOrdine: null, TotaleSpeseDiTrasporto: 'x' }),
    );
    expect(info.minimumAmount).toBe(0);
    expect(info.transportCost).toBe(0);
  });
});
