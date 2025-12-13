import {
  Exposition,
  RawExposition,
} from '@framework/acccount/types-b2b-account';

export function transformExposition(raw: RawExposition): Exposition {
  return {
    currencyCode: raw?.CodiceValuta ?? '',
    currencyLabel: raw?.DescrizioneValuta ?? '',

    directRemittancesExpired: raw?.RimesseScaduto ?? 0,
    directRemittancesToExpire: raw?.RimesseDaScadere ?? 0,
    directRemittancesTotal: raw?.RimesseTotale ?? 0,

    ribaExpired: raw?.CambiariaScatuto ?? 0,
    ribaToExpire: raw?.CambiariaDaScadere ?? 0,
    ribaTotal: raw?.CambiariaTotale ?? 0,

    unbilledBillsToExpire: raw?.BolleNonFatturateDaScadere ?? 0,
    unbilledBillsTotal: raw?.BolleNonFatturateTotale ?? 0,

    ordersNotFulfilledToExpire: raw?.OrdiniNonEvasiDaScadere ?? 0,
    ordersNotFulfilledTotal: raw?.OrdiniNonEvasiTotale ?? 0,

    prebillsToExpire: raw?.PrebolleNonEvaseDaScadere ?? 0,
    prebillsTotal: raw?.PrebolleNonEvaseTotale ?? 0,

    advancesTotal: raw?.AccontiTotale ?? 0,

    trustAssuredTotal: raw?.FidoAssicuratoTotale ?? 0,
    trustInternalTotal: raw?.FidoInternoTotale ?? 0,
    creditLimitTotal: raw?.FidoTotaleTotale ?? 0,

    total2Total: raw?.Totale2Totale ?? 0,
    differenceTotal: raw?.DifferenzaTotale ?? 0,

    message: raw?.Message ?? '',
    returnCode: raw?.ReturnCode ?? -1,
  };
}
