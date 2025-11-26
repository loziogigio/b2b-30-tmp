"use client";

import React from 'react';
import cn from 'classnames';
import Container from '@components/ui/container';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import TrendingProductsCarousel from '@components/product/feeds/trending-products-carousel';
import ProductsCarousel from '@components/product/products-carousel';
import { usePimProductListQuery } from '@framework/product/get-pim-product';
import CloseIcon from '@components/icons/close-icon';
import SearchBoxB2B from '@components/common/search-box-b2b';
import { SearchFiltersB2B } from '@components/search/filters-b2b';

type Props = {
  lang: string;
  open: boolean;
  onClose: () => void;
  value?: string;
  onChange?: (e: React.FormEvent<HTMLInputElement>) => void;
  onClear?: (e: React.SyntheticEvent) => void;
  onSubmitSuccess?: () => void;
};

const RECENT_KEY = 'b2b-recent-searches';

function useRecentSearches() {
  const [items, setItems] = React.useState<string[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      setItems(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setItems([]);
    }
  }, []);
  const remove = (term: string) => {
    const next = items.filter((t) => t !== term);
    setItems(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };
  const clear = () => {
    setItems([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };
  return { items, remove, clear };
}

// A lightweight panel that mirrors the provided design while
// staying consistent with our Tailwind styles.
export default function SearchOverlayB2B({ lang, open, onClose, value = '', onChange, onClear, onSubmitSuccess }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { items: recent, remove, clear } = useRecentSearches();
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Popular search seeds (simple defaults, can be wired to API later)
  const popular = React.useMemo(
    () => [
      'canna fumaria doppia parete',
      'mobile bagno sospeso 90 cm',
      'mobili bagno bianco',
      'paffoni',
      'lavatoio',
      'rubinetto miscelatore',
      'radiatore',
      'vaso espansine aperto',
      'radiatore interase 180',
      'mensola',
    ],
    [],
  );

  function gotoSearch(term: string) {
    const q = encodeURIComponent(term);
    onClose();
    router.push(`/${lang}/search?text=${q}`);
  }

  // Autocomplete results (min 3 chars)
  const trimmed = (value || '').trim();
  const showAutocomplete = trimmed.length >= 3;
  // Collect current URL filters (kept in sync by facet components)
  const urlFilters = React.useMemo(() => {
    const out: Record<string, string> = {};
    searchParams?.forEach((v, k) => {
      if (k.startsWith('filters-')) out[k] = v;
    });
    return out;
  }, [searchParams]);

  // Live preview query: typed text + selected filters
  const liveQueryParams = React.useMemo(() => (
    showAutocomplete
      ? { per_page: 12, start: 1, ...urlFilters, text: trimmed }
      : {}
  ), [showAutocomplete, urlFilters, trimmed]);

  const { data: autoProducts = [], isLoading: isLoadingAuto } = usePimProductListQuery(
    { ...liveQueryParams, q: trimmed },
    { enabled: open && showAutocomplete }  // Only query when overlay is open AND searching
  );

  // Close overlay on navigation to another route (e.g., product detail or search page)
  React.useEffect(() => {
    if (!open) return;
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close overlay when clicking any anchor inside the overlay (captures same-page links too)
  const handleClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (!open) return;
    const root = rootRef.current;
    let node = e.target as HTMLElement | null;
    while (node && node !== root) {
      if (node.tagName === 'A') {
        onClose();
        break;
      }
      node = node.parentElement as HTMLElement | null;
    }
  }, [open, onClose]);

  // Also listen globally while open, to catch links clicked outside the overlay
  // (e.g., in Product Popup portals) and close even for same-page links.
  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent) => {
      let el = ev.target as HTMLElement | null;
      while (el) {
        if (el.tagName === 'A') {
          onClose();
          break;
        }
        el = el.parentElement as HTMLElement | null;
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open, onClose]);

  // Overlay-specific carousel breakpoints: target ~4.5 items on large screens
  const overlayBreakpoints = {
    1921: { slidesPerView: 4.5 },
    1780: { slidesPerView: 4.5 },
    1536: { slidesPerView: 4.25 },
    1280: { slidesPerView: 4 },
    1100: { slidesPerView: 3.75 },
    1024: { slidesPerView: 3.5 },
    900: { slidesPerView: 3.2 },
    768: { slidesPerView: 3 },
    640: { slidesPerView: 2.5 },
    520: { slidesPerView: 2.2 },
    480: { slidesPerView: 2 },
    380: { slidesPerView: 1.5 },
    0: { slidesPerView: 1.2 },
  } as const;

  return (
    <div
      ref={rootRef}
      onClickCapture={handleClickCapture}
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-200',
        open ? 'opacity-100 visible' : 'opacity-0 invisible',
      )}
      aria-hidden={!open}
    >
      <div className="relative bg-white shadow-xl border-t border-amber-300">
        {/* Close button floats, not adding top margin */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-3 w-9 h-9 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <Container>
          {/* Inline search bar inside the overlay */}
          <div className="pt-2">
            <div className="max-w-[1100px] mx-auto">
              <SearchBoxB2B
                searchId="overlay-search"
                lang={lang}
                name="overlay-search"
                onSubmit={(e) => { e.preventDefault(); }}
                value={value}
                onChange={(e) => onChange?.(e)}
                onClear={(e) => onClear?.(e)}
                onFocus={() => { /* keep open */ }}
                onSubmitSuccess={() => {
                  onSubmitSuccess?.();
                  onClose();
                }}
              />
            </div>
            <div className="border-b border-amber-300 mt-2" />
          </div>

          {/* Recent searches row */}
          <div className="py-3">
            <div className="flex items-center flex-wrap gap-2 text-[13px]">
              <span className="font-semibold text-gray-700">Ultime ricerche:</span>
              {recent.length ? (
                recent.map((term) => (
                  <div
                    key={`chip-${term}`}
                    className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-gray-100 text-gray-700"
                    title={term}
                  >
                    <button
                      type="button"
                      onClick={() => gotoSearch(term)}
                      className="outline-none"
                      aria-label={`Select ${term}`}
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(term)}
                      aria-label={`Remove ${term}`}
                      className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-black"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-gray-400">Nessuna ricerca recente</span>
              )}
              {recent.length ? (
                <button
                  type="button"
                  className="ml-2 text-amber-500 hover:underline"
                  onClick={clear}
                >
                  Cancella tutto
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 pb-6">
            {/* Left column: Facets when searching, otherwise suggestions */}
            <div className="col-span-12 xl:col-span-3">
              {showAutocomplete ? (
                <SearchFiltersB2B lang={lang} text={trimmed} />
              ) : (
                <div>
                  <div className="text-base font-semibold text-gray-800 mb-2">
                    Ricerche popolari
                  </div>
                  <div className="flex flex-col gap-1">
                    {popular.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="text-left px-2 py-1 rounded hover:bg-gray-50"
                        onClick={() => gotoSearch(term)}
                        title={term}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Trending carousel used as recommended products */}
            <div className="col-span-12 xl:col-span-9">
              {showAutocomplete && (
                <div className="mb-6">
                  <ProductsCarousel
                    sectionHeading={`See all results for "${trimmed}"`}
                    categorySlug={`search?${(() => {
                      const p = new URLSearchParams();
                      if (trimmed) p.set('text', trimmed);
                      Object.entries(urlFilters).forEach(([k, v]) => p.set(k, v));
                      return p.toString();
                    })()}`}
                    products={autoProducts}
                    loading={isLoadingAuto}
                    limit={12}
                    uniqueKey={`overlay-autocomplete`}
                    lang={lang}
                    carouselBreakpoint={overlayBreakpoints}
                  />
                </div>
              )}
              {open && (
                <TrendingProductsCarousel
                  lang={lang}
                  limitSkus={18}
                  sectionTitle="Prodotti consigliati"
                  carouselBreakpoint={overlayBreakpoints}
                />
              )}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
