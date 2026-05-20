'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@components/ui/link';
import { useTranslation } from 'src/app/i18n/client';
import type { MenuTreeNode } from '@framework/product/get-pim-menu';
import {
  buildCatalogueIndexModel,
  type CatalogueIndexModel,
  type CatalogueSection,
} from './build-catalogue-index-model';

/** Wrap query matches in <mark> for the filter. */
function Highlight({ text, q }: { text: string; q: string }) {
  const needle = q.trim().toLowerCase();
  if (!needle) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let key = 0;
  let idx = lower.indexOf(needle, from);
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded-[3px] bg-yellow-200 px-px text-inherit"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = lower.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
}

function filterSections(
  model: CatalogueIndexModel,
  q: string,
): { sections: CatalogueSection[]; matchCount: number | null } {
  const query = q.trim().toLowerCase();
  if (!query) return { sections: model.sections, matchCount: null };
  let matchCount = 0;
  const sections = model.sections
    .map((s) => {
      const groups = s.groups
        .map((g) => {
          const items = g.items.filter((it) =>
            it.label.toLowerCase().includes(query),
          );
          matchCount += items.length;
          return { ...g, items };
        })
        .filter((g) => g.items.length > 0);
      return { ...s, groups };
    })
    .filter((s) => s.groups.length > 0);
  return { sections, matchCount };
}

export default function TimeCatalogueIndex({
  tree,
  current,
  lang,
}: {
  tree: MenuTreeNode[];
  current: MenuTreeNode | null;
  lang: string;
}) {
  const { t } = useTranslation(lang, 'common');
  const rootLabel = t('all-categories', {
    defaultValue: lang === 'it' ? 'Tutti i gruppi' : 'All Groups',
  });

  const model = useMemo(
    () => buildCatalogueIndexModel(tree, current, lang, rootLabel),
    [tree, current, lang, rootLabel],
  );

  const [query, setQuery] = useState('');
  const { sections, matchCount } = useMemo(
    () => filterSections(model, query),
    [model, query],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !mainRef.current) return;
    const els =
      mainRef.current.querySelectorAll<HTMLElement>('[data-cat-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.id;
            if (id) setActiveId(id);
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const searchLabel = t('catalogue-search-placeholder', {
    defaultValue: lang === 'it' ? 'Cerca una categoria…' : 'Search a category…',
  });
  const clearLabel = t('catalogue-clear-search', {
    defaultValue: lang === 'it' ? 'Cancella ricerca' : 'Clear search',
  });
  const title = t('catalogue-index-title', {
    defaultValue: lang === 'it' ? 'Indice del catalogo' : 'Catalogue index',
  });
  const subtitle = current
    ? current.label || current.name
    : t('catalogue-index-subtitle', {
        defaultValue:
          lang === 'it'
            ? 'Tutti i gruppi e le categorie merceologiche.'
            : 'All product groups and categories.',
      });
  const hasQuery = query.trim().length > 0;

  return (
    <div className="bg-[var(--time-gray-50)] font-[family-name:var(--font-body)] text-[var(--time-gray-900)]">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-6 lg:px-7">
        {/* Substrip */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-extrabold tracking-tight md:text-[30px]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--time-gray-500)]">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-7">
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-none tabular-nums text-[var(--color-brand)]">
                {model.totalGroups}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--time-gray-500)]">
                {t('catalogue-stat-groups', {
                  defaultValue: lang === 'it' ? 'Gruppi' : 'Groups',
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-none tabular-nums text-[var(--color-brand)]">
                {model.totalLeaves}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--time-gray-500)]">
                {t('catalogue-stat-categories', {
                  defaultValue: lang === 'it' ? 'Categorie' : 'Categories',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="relative mb-6 max-w-[520px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={searchLabel}
            placeholder={searchLabel}
            className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--time-gray-200)] bg-white px-4 text-[15px] outline-none focus:border-[var(--color-brand)]"
          />
          {hasQuery && (
            <button
              type="button"
              aria-label={clearLabel}
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--time-gray-500)]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[260px_1fr]">
          {/* Rail (desktop) */}
          <nav className="sticky top-[88px] hidden max-h-[calc(100vh-110px)] overflow-auto rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white p-2.5 lg:block">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--time-gray-400)]">
              {t('catalogue-rail-title', {
                defaultValue: lang === 'it' ? 'Vai al gruppo' : 'Jump to group',
              })}
            </div>
            {model.sections.map((s) => (
              <a
                key={s.id}
                href={`#sec-${s.id}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  activeId === s.id
                    ? 'bg-[var(--time-gray-50)] text-[var(--time-gray-900)]'
                    : 'text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 flex-none rounded-[3px]"
                  style={{ background: s.accent }}
                />
                <span className="flex-1 leading-tight">{s.label}</span>
                <span className="text-[11px] tabular-nums text-[var(--time-gray-400)]">
                  {s.count}
                </span>
              </a>
            ))}
          </nav>

          {/* Main */}
          <main ref={mainRef} className="min-w-0">
            {hasQuery && !!matchCount && (
              <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white px-4 py-3 text-sm font-semibold text-[var(--time-gray-600)]">
                {matchCount}{' '}
                {t('catalogue-results-found', {
                  defaultValue:
                    lang === 'it' ? 'categorie trovate' : 'categories found',
                })}
              </div>
            )}

            {sections.length === 0 ? (
              <div className="py-16 text-center text-[var(--time-gray-500)]">
                <div className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--time-gray-900)]">
                  {t('catalogue-no-results-title', {
                    defaultValue:
                      lang === 'it'
                        ? 'Nessuna categoria trovata'
                        : 'No categories found',
                  })}
                </div>
                <div className="mt-1 text-sm">
                  {t('catalogue-no-results-body', {
                    defaultValue:
                      lang === 'it'
                        ? 'Prova con un termine diverso.'
                        : 'Try a different term.',
                  })}
                </div>
              </div>
            ) : (
              sections.map((s) => (
                <section
                  key={s.id}
                  id={`sec-${s.id}`}
                  data-cat-section
                  data-id={s.id}
                  style={{ ['--accent' as string]: s.accent }}
                  className="mb-4 scroll-mt-[88px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--time-gray-200)] bg-white"
                >
                  <div className="flex items-center gap-4 border-b border-l-4 border-[var(--time-gray-100)] border-l-[var(--accent)] px-5 py-4">
                    <span
                      className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-[10px] text-white"
                      style={{ background: 'var(--accent)' }}
                    >
                      {s.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.iconUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold">
                          {(s.label || '?').charAt(0)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold uppercase tracking-tight text-[var(--time-gray-900)]">
                        {s.label}
                      </h2>
                      {s.subtitle && (
                        <div className="mt-0.5 truncate text-xs text-[var(--time-gray-500)]">
                          {s.subtitle}
                        </div>
                      )}
                    </div>
                    <Link
                      href={s.href}
                      className="flex-none rounded-full border border-[var(--time-gray-200)] px-3.5 py-2 text-[13px] font-bold uppercase tracking-wide text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                    >
                      {t('catalogue-view-all', {
                        defaultValue:
                          lang === 'it' ? 'Tutto il gruppo' : 'View all',
                      })}
                    </Link>
                  </div>

                  <div className="px-5 pb-4 pt-1">
                    {s.groups.map((g, gi) => (
                      <div
                        key={g.name ?? `__direct-${gi}`}
                        className={
                          gi > 0
                            ? 'mt-2 border-t border-dashed border-[var(--time-gray-100)] pt-3'
                            : 'pt-3'
                        }
                      >
                        {g.name && (
                          <div className="mb-2.5 flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-wide text-[var(--accent)]">
                            <span>{g.name}</span>
                            <span className="text-[11px] tabular-nums text-[var(--time-gray-400)]">
                              {g.count}
                            </span>
                            <span className="h-px flex-1 bg-[var(--time-gray-100)]" />
                          </div>
                        )}
                        <div className="columns-1 gap-7 sm:columns-2 lg:columns-3 xl:columns-4">
                          {g.items.map((it, ii) => (
                            <Link
                              key={it.href}
                              href={it.href}
                              className="flex break-inside-avoid items-baseline gap-2 rounded-md py-1.5 pl-0.5 pr-1.5 text-[13.5px] text-[var(--time-gray-600)] hover:bg-[var(--time-gray-50)] hover:text-[var(--accent)]"
                            >
                              {/* sr-only span provides the accessible name without markup interference */}
                              <span className="sr-only">{it.label}</span>
                              {/* Visual rendering excluded from accessible name computation */}
                              <span
                                aria-hidden="true"
                                className="flex items-baseline gap-2"
                              >
                                <span className="flex-none font-bold text-[var(--accent)]">
                                  ›
                                </span>
                                <Highlight text={it.label} q={query} />
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
