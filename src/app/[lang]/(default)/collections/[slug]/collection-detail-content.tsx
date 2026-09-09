'use client';

import React from 'react';
import Container from '@components/ui/container';
import Link from 'next/link';
import { getThemedComponent } from '@/lib/theme/registry';
import {
  HiOutlineHome,
  HiOutlineChevronRight,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { useTranslation } from 'src/app/i18n/client';
import { useCollection } from '@framework/collections/use-collections';
import { useQueryClient } from '@tanstack/react-query';
import { isEmptyHtml } from '@/lib/html';

// The same sidebar + grid the search page renders, picked per tenant theme.
// Sharing the slot is what keeps a collection looking like a scoped search
// instead of a second, drifting product listing.
const ThemedSearchResults = getThemedComponent<{
  lang: string;
  text?: string;
  collectionSlug?: string;
  header?: React.ReactNode;
}>('SearchResults');

interface CollectionDetailContentProps {
  lang: string;
  slug: string;
}

export default function CollectionDetailContent({
  lang,
  slug,
}: CollectionDetailContentProps) {
  const { t } = useTranslation(lang, 'common');
  const queryClient = useQueryClient();
  const { data: collection, isLoading, error, refetch } = useCollection(slug);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['collection', slug] });
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <div className="py-4">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="mb-6 pb-6 border-b border-slate-200">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-96 bg-slate-200 animate-pulse rounded mb-3" />
          <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
        </div>
      </Container>
    );
  }

  // Error or not found state
  if (error || !collection) {
    return (
      <Container>
        <div className="py-12 text-center">
          <p className="text-slate-500">
            {t('text-collection-not-found', {
              defaultValue: 'Collezione non trovata',
            })}
          </p>
          <Link
            href={`/${lang}/collections`}
            className="mt-4 inline-block text-brand hover:underline"
          >
            {t('text-back-to-collections', {
              defaultValue: 'Torna alle collezioni',
            })}
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Breadcrumbs */}
      <nav
        className="flex items-center gap-2 py-4 text-sm"
        aria-label="Breadcrumb"
      >
        <Link
          href={`/${lang}`}
          className="flex items-center gap-1 text-slate-500 hover:text-brand transition-colors"
        >
          <HiOutlineHome className="w-4 h-4" />
          <span>{t('text-home', { defaultValue: 'Home' })}</span>
        </Link>
        <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />
        <Link
          href={`/${lang}/collections`}
          className="text-slate-500 hover:text-brand transition-colors"
        >
          {t('text-collections', { defaultValue: 'Collezioni' })}
        </Link>
        <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />
        <span className="font-medium text-slate-900">{collection.name}</span>
      </nav>

      {/* Facet sidebar + product grid, same as the search page. The title
          block rides in the content column rather than full-width above it, so
          the facet column starts level with it instead of below it. The
          breadcrumb stays full-width at the top of the page. */}
      <ThemedSearchResults
        lang={lang}
        collectionSlug={slug}
        header={
          <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Collection Image */}
              {collection.hero_image?.url && (
                <div className="flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                  <img
                    src={collection.hero_image.url}
                    alt={collection.hero_image.alt_text || collection.name}
                    className="object-contain w-full h-auto md:w-20 md:h-20"
                  />
                </div>
              )}

              {/* Title and Description */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  {collection.name}
                </h1>
                {!isEmptyHtml(collection.description) && (
                  <p className="mt-1 text-slate-600">
                    {collection.description}
                  </p>
                )}
                {collection.product_count !== undefined && (
                  <span className="mt-2 inline-block text-sm text-slate-500">
                    {t('text-products-count', {
                      count: collection.product_count.toLocaleString('it-IT'),
                      defaultValue: '{{count}} prodotti',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        }
      />
    </Container>
  );
}
