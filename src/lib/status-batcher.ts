/**
 * Coalesces per-item status lookups (likes, reminders) into batched requests.
 *
 * Product rows and cards ask for their own SKU on mount. Without coalescing a
 * 60-row list made 60 calls to the "bulk" endpoint, each carrying one SKU
 * (hidros, 2026-09-09), and every response re-triggered every row. Calls made
 * within `delayMs` of each other become one request (chunked at the server's
 * per-request cap), SKUs already answered are served from cache, and a SKU
 * currently in flight is joined rather than re-requested.
 */

export type StatusFetcher<T> = (skus: string[]) => Promise<Record<string, T>>;

export interface StatusBatcherOptions {
  /** Server-side cap per request. Commerce Suite refuses more than 100. */
  maxPerRequest?: number;
  /** Collection window. Sibling effects of one React commit land inside it. */
  delayMs?: number;
}

export interface StatusBatcher<T> {
  /** Statuses for `skus`; only SKUs the server returned are present. */
  load(skus: string[]): Promise<Record<string, T>>;
  /** Record locally known values (after a toggle) so a later load does not ask again. */
  prime(values: Record<string, T>): void;
  /** Forget everything (logout, login, "clear all"). */
  reset(): void;
}

type Failures = Map<string, unknown>;

type PendingBatch = {
  skus: Set<string>;
  promise: Promise<Failures>;
  resolve: (failures: Failures) => void;
};

function normalize(input: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input ?? []) {
    const sku = typeof raw === 'string' ? raw.trim() : '';
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    out.push(sku);
  }
  return out;
}

export function createStatusBatcher<T>(
  fetcher: StatusFetcher<T>,
  options: StatusBatcherOptions = {},
): StatusBatcher<T> {
  const maxPerRequest = Math.max(1, options.maxPerRequest ?? 100);
  const delayMs = Math.max(0, options.delayMs ?? 25);

  /** SKUs already asked; `undefined` means the server returned nothing for it. */
  let known = new Map<string, T | undefined>();
  /** SKU -> the batch currently fetching it. */
  let inflight = new Map<string, Promise<Failures>>();
  let pending: PendingBatch | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by reset(); responses from an older generation are discarded. */
  let generation = 0;

  async function run(skus: string[], gen: number): Promise<Failures> {
    const failures: Failures = new Map();
    const chunks: string[][] = [];
    for (let i = 0; i < skus.length; i += maxPerRequest) {
      chunks.push(skus.slice(i, i + maxPerRequest));
    }
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const result = await fetcher(chunk);
          if (gen !== generation) return;
          for (const sku of chunk) known.set(sku, result?.[sku]);
        } catch (error) {
          for (const sku of chunk) failures.set(sku, error);
        }
      }),
    );
    return failures;
  }

  function flush(): void {
    timer = null;
    const batch = pending;
    pending = null;
    if (!batch) return;
    const skus = Array.from(batch.skus);
    for (const sku of skus) inflight.set(sku, batch.promise);
    void run(skus, generation).then((failures) => {
      for (const sku of skus) {
        if (inflight.get(sku) === batch.promise) inflight.delete(sku);
      }
      batch.resolve(failures);
    });
  }

  function schedule(): PendingBatch {
    if (!pending) {
      let resolve!: (failures: Failures) => void;
      const promise = new Promise<Failures>((r) => {
        resolve = r;
      });
      pending = { skus: new Set(), promise, resolve };
      timer = setTimeout(flush, delayMs);
    }
    return pending;
  }

  async function load(input: string[]): Promise<Record<string, T>> {
    const skus = normalize(input);
    if (!skus.length) return {};

    const waits = new Set<Promise<Failures>>();
    for (const sku of skus) {
      if (known.has(sku)) continue;
      const running = inflight.get(sku);
      if (running) {
        waits.add(running);
        continue;
      }
      const batch = schedule();
      batch.skus.add(sku);
      waits.add(batch.promise);
    }

    const settled = await Promise.all(waits);
    for (const failures of settled) {
      for (const sku of skus) {
        if (failures.has(sku)) throw failures.get(sku);
      }
    }

    const out: Record<string, T> = {};
    for (const sku of skus) {
      const value = known.get(sku);
      if (value !== undefined) out[sku] = value;
    }
    return out;
  }

  function prime(values: Record<string, T>): void {
    for (const [raw, value] of Object.entries(values ?? {})) {
      const sku = raw.trim();
      if (sku) known.set(sku, value);
    }
  }

  function reset(): void {
    generation += 1;
    known = new Map();
    inflight = new Map();
    // A batch collected but not yet sent is kept: it flushes under the new
    // generation. React runs child effects before parent effects, so on
    // mount (and on login) the rows have already queued their SKUs when the
    // provider resets; dropping them would leave those rows unanswered.
    // Responses still in flight for the old generation are discarded in run().
  }

  return { load, prime, reset };
}
