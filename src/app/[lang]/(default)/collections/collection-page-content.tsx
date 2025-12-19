'use client';

import Container from '@components/ui/container';
import Link from 'next/link';
import { useTranslation } from 'src/app/i18n/client';
import { useCollections } from '@framework/collections/use-collections';

export default function CollectionPageContent({ lang }: { lang: string }) {
  const { t } = useTranslation(lang, 'common');
  const { data: collections, isLoading, error } = useCollections();

  return (
    <Container>
      <div className="py-8 lg:py-12">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {t('text-our-collections', { defaultValue: 'Le Nostre Collezioni' })}
          </h1>
          <p className="mt-2 text-slate-600">
            {t('text-explore-catalog-by-collections', {
              defaultValue: 'Esplora il nostro catalogo organizzato per Collezioni',
            })}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-slate-200 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {t('text-error-loading', {
                defaultValue: 'Errore nel caricamento delle collezioni',
              })}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && collections?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {t('text-no-collections', {
                defaultValue: 'Nessuna collezione disponibile',
              })}
            </p>
          </div>
        )}

        {/* Collections Grid */}
        {!isLoading && collections && collections.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/${lang}/collections/${collection.slug}`}
                className="group relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] block shadow-sm hover:shadow-lg transition-shadow"
              >
                {/* Collection Image or Placeholder */}
                {collection.hero_image?.url ? (
                  <img
                    src={collection.hero_image.url}
                    alt={collection.hero_image.alt_text || collection.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <span className="text-6xl opacity-30">
                      {collection.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="text-xl font-bold group-hover:text-brand transition-colors">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-sm text-white/80 mt-1">
                      {collection.description}
                    </p>
                  )}
                  {collection.product_count !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1">
                        {t('text-products-count', {
                          count: collection.product_count.toLocaleString('it-IT'),
                          defaultValue: '{{count}} prodotti',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover arrow */}
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
