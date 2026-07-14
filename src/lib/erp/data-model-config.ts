import type { MyMbErpSettings } from 'vinc-erp';

/**
 * Fallback used when no `erp_settings` data-model record exists for the tenant.
 * Mirrors the values every legacy `dfl-api` env shipped (PACKAGING_OPTIONS_ID=1,2,
 * managed substitutes/supplier on, and the DISPONIBILE/NON DISPONIBILE/IN ARRIVO
 * case labels), so the time-theme ERP path behaves like the Python backend
 * out-of-the-box. Override per-tenant via the `erp_settings` record.
 */
export const DEFAULT_ERP_SETTINGS: MyMbErpSettings = {
  packagingOptionsId: [1, 2],
  isManagedSubstitutes: true,
  isManagedSupplierOrder: true,
  cases: {
    '0': { label: 'DISPONIBILE', addToCart: true },
    '1': { label: 'NON DISPONIBILE', addToCart: false },
    '2': { label: 'NON DISPONIBILE', addToCart: false },
    '3': { label: 'IN ARRIVO', addToCart: true },
    '4': { label: 'NON DISPONIBILE', addToCart: false },
    '5': { label: 'NON DISPONIBILE', addToCart: false },
  },
  updatePromoSeconds: 21600,
  updateAvailableAgainSeconds: 21600,
};

type StoredCase = { case?: number; label?: string; add_to_cart?: boolean };

/** Map a raw `erp_settings` record `data` object to typed settings. Pure. */
export function mapErpSettingsRecord(
  data: Record<string, unknown>,
): MyMbErpSettings {
  const packagingOptionsId = String(data.packaging_options_id ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const cases: MyMbErpSettings['cases'] = {};
  if (Array.isArray(data.cases)) {
    for (const c of data.cases as StoredCase[]) {
      if (c && c.case != null) {
        cases[String(c.case)] = {
          label: c.label ?? '',
          addToCart: Boolean(c.add_to_cart),
        };
      }
    }
  }

  return {
    packagingOptionsId,
    isManagedSubstitutes: Boolean(data.is_managed_substitutes),
    isManagedSupplierOrder: Boolean(data.is_managed_supplier_order),
    cases,
    updatePromoSeconds: Number(
      data.update_promo_seconds ?? DEFAULT_ERP_SETTINGS.updatePromoSeconds,
    ),
    updateAvailableAgainSeconds: Number(
      data.update_available_again_seconds ??
        DEFAULT_ERP_SETTINGS.updateAvailableAgainSeconds,
    ),
  };
}

interface FetchArgs {
  /** Commerce Suite base URL (tenant.api.pimApiUrl). */
  csBaseUrl: string;
  apiKeyId: string;
  apiSecret: string;
}

/**
 * Fetch the singleton `erp_settings` record from Commerce Suite for this tenant
 * (relation_id=_global, channel=b2b) and map it to typed settings. Returns
 * DEFAULT_ERP_SETTINGS if the record is absent OR unreachable.
 *
 * This record is an optional per-tenant OVERRIDE — the defaults reproduce the
 * legacy behaviour on their own. So it must never be able to take pricing down:
 * a DNS/network failure here (e.g. the cluster-internal Commerce Suite host not
 * resolving from a dev machine) previously threw straight out of
 * getMyMbErpClient and 502'd every price request.
 */
export async function fetchErpSettings(
  args: FetchArgs,
): Promise<MyMbErpSettings> {
  try {
    const url = new URL(
      `${args.csBaseUrl.replace(/\/+$/, '')}/api/b2b/data-models/erp_settings/records`,
    );
    url.searchParams.set('relation_id', '_global');
    url.searchParams.set('channel', 'b2b');

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'x-auth-method': 'api-key',
        'x-api-key-id': args.apiKeyId,
        'x-api-secret': args.apiSecret,
      },
    });
    if (!res.ok) return DEFAULT_ERP_SETTINGS;

    const json: any = await res.json();
    const record = json?.data?.items?.[0];
    if (!record?.data) return DEFAULT_ERP_SETTINGS;
    return mapErpSettingsRecord(record.data as Record<string, unknown>);
  } catch (err) {
    console.warn(
      '[erp_settings] unreachable, falling back to defaults:',
      err instanceof Error ? err.message : err,
    );
    return DEFAULT_ERP_SETTINGS;
  }
}
