"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabelAndCartStatus = getLabelAndCartStatus;
exports.getPackagingOptions = getPackagingOptions;
exports.buildPriceEntry = buildPriceEntry;
/**
 * Port of Python `get_label_and_cart_status`. Determines the availability
 * "case" (0..5) and resolves label / add-to-cart from `config.cases`.
 */
function getLabelAndCartStatus(quantityAvailable, substituteAvailable, orderSupplierAvailable, config) {
    const subs = config.isManagedSubstitutes;
    const supplier = config.isManagedSupplierOrder;
    const hasSub = Array.isArray(substituteAvailable) && substituteAvailable.length > 0;
    const hasArr = Array.isArray(orderSupplierAvailable) && orderSupplierAvailable.length > 0;
    // A substitute/arrival only counts when that behaviour is actually managed.
    const substituteApplies = subs && hasSub;
    const arrivalApplies = supplier && hasArr;
    // Order matters: 1 (both) -> 2 (substitute) -> 3 (arrival) -> 5 (nothing
    // managed at all) -> 4 (managed, but nothing available).
    //
    // The previous ladder required `supplier` on every branch for cases 1-4 and
    // required BOTH flags false for case 5, so `subs=true, supplier=false` (and
    // `subs=false, supplier=true`) matched nothing, left `c` null and rendered
    // the literal 'UNKNOWN'. That is the erp_settings blueprint default, so any
    // tenant seeded from it showed UNKNOWN instead of its configured
    // "Non disponibile" whenever stock hit 0.
    let c;
    if (quantityAvailable > 0) {
        c = 0;
    }
    else if (substituteApplies && arrivalApplies) {
        c = 1;
    }
    else if (substituteApplies) {
        c = 2;
    }
    else if (arrivalApplies) {
        c = 3;
    }
    else if (!subs && !supplier) {
        c = 5;
    }
    else {
        c = 4;
    }
    const entry = config.cases[String(c)];
    return {
        LABEL: entry?.label ?? 'UNKNOWN',
        ADD_TO_CART: entry?.addToCart ?? false,
        substitute_available: hasSub ? substituteAvailable : null,
        order_supplier_available: hasArr ? orderSupplierAvailable : null,
        quantity_available: quantityAvailable,
        is_managed_substitutes: subs,
        is_managed_supplier_order: supplier,
        case: c,
    };
}
/**
 * Port of Python `get_packaging_options`. Returns the packaging rows whose
 * `IdImballo` is in `orderIds`, ordered to match `orderIds`, each copied and
 * enriched with `id`/`label`/`amount`.
 */
function getPackagingOptions(list, orderIds) {
    if (!Array.isArray(list) || list.length === 0)
        return [];
    const out = [];
    for (const id of orderIds) {
        const item = list.find((it) => it.IdImballo === id);
        if (item) {
            out.push({
                ...item,
                id: item.IdImballo,
                label: item.CodiceImballo1,
                amount: item.QtaXImballo,
            });
        }
    }
    return out;
}
function mapPackaging(p) {
    return {
        packaging_id: p.IdImballo,
        packaging_uom_description: p.DescrizioneUM,
        packaging_code: p.CodiceImballo1,
        packaging_is_default: p.IsImballoDiDefaultXVendita,
        packaging_is_smallest: p.IsImballoPiuPiccolo,
        qty_x_packaging: p.QtaXImballo,
        packaging_uom: p.UM,
    };
}
/** Python `datetime.strptime(s, "%m/%d/%Y %H:%M:%S %p").strftime("%d/%m/%y")`. */
function formatPromoValidity(raw) {
    if (typeof raw !== 'string')
        return '';
    const datePart = raw.split(' ')[0]; // MM/DD/YYYY
    const [mm, dd, yyyy] = datePart.split('/');
    if (!mm || !dd || !yyyy)
        return '';
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy.slice(-2)}`;
}
/**
 * Port of the per-row body of Python `get_multiple_prices`. Pure: the
 * substitute-fallback network call is applied by the client afterwards.
 */
function buildPriceEntry(price, settings) {
    const packagingList = price?.ImballiArticolo?.ListaImballoXArticolo ?? [];
    const packagingAll = packagingList.map(mapPackaging);
    let smallest;
    let dflt;
    for (const p of packagingList) {
        const opt = mapPackaging(p);
        if (p.IsImballoPiuPiccolo)
            smallest = opt;
        if (p.IsImballoDiDefaultXVendita)
            dflt = opt;
    }
    const allPromo = price.RighePromo ?? {};
    const improving = price.RigaPromozioneMigliorativa ?? {};
    const arrivi = price.ArriviPerArticolo ?? {};
    const supplierArrivals = arrivi?.ListaArrivi ?? [];
    const entry = {
        entity_code: price.CodiceInternoArticolo,
        vat_percent: price.IVAPercentuale,
        availability: price.QtaDisponibile,
        all_promo: allPromo,
        improving_promo: improving,
        net_price: price.PrezzoNettoXVisualizzazione,
        gross_price: price.Prezzo,
        count_promo: Array.isArray(allPromo) ? allPromo.length : 0,
        is_improving_promo_net_price: false,
        buy_did: price.IsArticoloOrdinatoInPrecedenza ?? '',
        buy_did_amount: price.QtaUltimoOrdine ?? '',
        buy_did_last_date: price.DataUltimoOrdine ?? '',
        promo: price.IsArticoloPromozionabile ?? false,
        promozionale: price.IsListinoPromozionale ?? false,
        num_promo: price.NrPromozioniPotenzialmenteApplicabili ?? 0,
        num_promo_canvas: price.NumeroPromozioniCanvas ?? 0,
        discount: [
            price.ScontoORicarica1, price.ScontoORicarica2, price.ScontoORicarica3,
            price.ScontoORicarica4, price.ScontoORicarica5, price.ScontoORicarica6,
        ],
        pricelist_type: price.TipoListinoUtilizzato,
        pricelist_code: price.CodiceListinoUtilizzato,
        packaging_option_smallest: smallest,
        packaging_option_default: dflt,
        packaging_options_all: packagingAll,
        packaging_options: getPackagingOptions(packagingList, settings.packagingOptionsId),
        order_suplier_available: supplierArrivals,
        prod_substitution: [],
        product_label_action: getLabelAndCartStatus(Number(price.QtaDisponibile ?? 0), [], supplierArrivals, settings),
    };
    const hasImproving = improving && typeof improving === 'object' && improving.CodicePromozione != null;
    if (hasImproving) {
        const imp = improving;
        entry.is_improving_promo_net_price = imp.TipoPromozione === 'RigaPrezzoNettoQuantitaMinima';
        entry.price = imp.PrezzoNettoListinoDiRiferimento;
        entry.price_discount = imp.PrezzoNettoConPromo;
        entry.promo_price = imp.PrezzoNettoConPromo;
        entry.promo_code = imp.CodicePromozione;
        entry.promo_row = imp.RigaPromozione;
        entry.is_improving_promo = true;
        entry.is_promo = true;
        entry.promo_title = imp.TitoloPromozione;
        entry.start_promo_date = formatPromoValidity(imp.DataInizioValitita);
        entry.end_promo_date = formatPromoValidity(imp.DataFineValidita);
        entry.discount_extra = [imp.ScontoExtra1, imp.ScontoExtra2, imp.ScontoExtra3];
    }
    else {
        entry.price = price.Prezzo;
        entry.price_discount = price.PrezzoNettoXVisualizzazione;
        entry.is_improving_promo = false;
        entry.is_promo = false;
    }
    return entry;
}
//# sourceMappingURL=transform.js.map