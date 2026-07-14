import { fetchErpPrices } from '@framework/erp/prices';
import type { ErpPriceData } from '@utils/transform/erp-prices';

/**
 * Request coalescer for single-product ERP price lookups.
 *
 * `useProductPriceData` is used by every card, row and popup, and each call
 * posted `entity_codes: [oneCode]` — so a grid of N products fired N HTTP
 * requests at `get_multiple_prices`, an endpoint that already accepts an array.
 * A home page of blocks would open dozens of parallel fetches and starve the
 * browser's connection pool.
 *
 * Callers enqueue a single entity_code and get a promise back. Codes requested
 * within the same batch window are deduped and sent as ONE `entity_codes[]`
 * request, then each promise is resolved with its own slice. Consumers keep
 * their existing per-code React Query cache entry — this only merges the
 * network calls underneath them.
 */

/** How long to collect codes before flushing. One React commit is well under
 *  this, so a full grid coalesces into a single request, while a late-mounting
 *  card (lazy block, infinite scroll) just starts the next batch. */
const BATCH_WINDOW_MS = 25;

/** Cap on entity_codes per ERP request. A page can hold hundreds of products;
 *  one unbounded request would be slower than a few parallel ones and risks
 *  tripping ERP/proxy payload limits. Flushes chunk at this size. */
const MAX_BATCH_SIZE = 50;

export interface ErpPriceRequest {
  entityCode: string;
  quantity: number;
  idCart: string;
  customerCode: string;
  addressCode: string;
  theme?: string;
}

interface Pending {
  entityCode: string;
  resolve: (value: ErpPriceData | undefined) => void;
  reject: (reason: unknown) => void;
}

interface Batch {
  pending: Pending[];
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Batches are keyed by everything that must be identical for the codes to
 * share ONE request: the ERP customer context, the cart, the theme (which
 * selects the transport), and the quantity (the payload's `quantity_list` is
 * positional, so mixing quantities for the same code in one request would be
 * ambiguous). In practice virtually every card asks for quantity 1, so this
 * collapses to a single batch per page.
 */
function batchKey(req: ErpPriceRequest): string {
  return [
    req.customerCode,
    req.addressCode,
    req.idCart,
    req.theme ?? '',
    req.quantity,
  ].join('|');
}

const batches = new Map<string, Batch>();

/** Exported for tests — drops all in-flight batches. */
export function __resetErpPriceBatcher(): void {
  for (const batch of batches.values()) clearTimeout(batch.timer);
  batches.clear();
}

async function flush(key: string, req: ErpPriceRequest): Promise<void> {
  const batch = batches.get(key);
  if (!batch) return;
  batches.delete(key);

  const { pending } = batch;

  // Dedupe: two cards showing the same product must produce one code, but each
  // still gets its own promise resolved.
  const codes = Array.from(new Set(pending.map((p) => p.entityCode)));

  for (let i = 0; i < codes.length; i += MAX_BATCH_SIZE) {
    const chunk = codes.slice(i, i + MAX_BATCH_SIZE);
    const waiters = pending.filter((p) => chunk.includes(p.entityCode));

    try {
      const priceMap = await fetchErpPrices({
        entity_codes: chunk,
        quantity_list: new Array(chunk.length).fill(req.quantity),
        id_cart: req.idCart,
        customer_code: req.customerCode,
        address_code: req.addressCode,
        theme: req.theme,
      });

      for (const waiter of waiters) {
        // A code the ERP did not price is `undefined`, not an error — the
        // caller renders its inline/synth fallback, exactly as before.
        waiter.resolve(priceMap?.[waiter.entityCode]);
      }
    } catch (err) {
      // One failed chunk must not reject codes in another chunk.
      for (const waiter of waiters) waiter.reject(err);
    }
  }
}

/**
 * Enqueue one entity_code and receive its ERP slice. Codes enqueued within the
 * batch window are sent as a single `get_multiple_prices` request.
 */
export function loadErpPrice(
  req: ErpPriceRequest,
): Promise<ErpPriceData | undefined> {
  const key = batchKey(req);

  return new Promise<ErpPriceData | undefined>((resolve, reject) => {
    const existing = batches.get(key);

    if (existing) {
      existing.pending.push({ entityCode: req.entityCode, resolve, reject });
      return;
    }

    batches.set(key, {
      pending: [{ entityCode: req.entityCode, resolve, reject }],
      timer: setTimeout(() => {
        void flush(key, req);
      }, BATCH_WINDOW_MS),
    });
  });
}
