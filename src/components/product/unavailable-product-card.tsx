'use client';

import cn from 'classnames';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Image from '@components/ui/image';
import { productPlaceholder } from '@assets/placeholders';
import { IoIosHeart } from 'react-icons/io';
import { ReminderIconFilled } from '@components/icons/app-icons';
import { useLikes } from '@contexts/likes/likes.context';
import { useReminders } from '@contexts/reminders/reminders.context';
import { useTranslation } from 'src/app/i18n/client';
import type { ListProductSnapshot } from '@framework/types';
import type {
  SavedListSource,
  UnavailableListItem,
} from '@components/search/special-source';

/** The snapshot's name in `lang`, else in any language, else the SKU. */
export function snapshotName(
  product: ListProductSnapshot | undefined,
  lang: string,
  sku: string,
): string {
  const name = product?.name;
  if (typeof name === 'string') return name.trim() || sku;
  return name?.[lang] || Object.values(name ?? {}).find(Boolean) || sku;
}

interface UnavailableProductCardProps {
  sku: string;
  product?: ListProductSnapshot;
  lang: string;
  layout?: 'grid' | 'list';
  removeLabel: string;
  removeIcon: React.ReactNode;
  onRemove: () => Promise<unknown> | void;
  className?: string;
}

/**
 * A saved product the catalog no longer returns: greyed out and not clickable.
 * Removing it from the list is the only thing left to do with it.
 */
export function UnavailableProductCard({
  sku,
  product,
  lang,
  layout = 'grid',
  removeLabel,
  removeIcon,
  onRemove,
  className,
}: UnavailableProductCardProps) {
  const { t } = useTranslation(lang, 'common');
  const statusId = React.useId();
  const [removing, setRemoving] = React.useState(false);
  const [removed, setRemoved] = React.useState(false);

  if (removed) return null;

  const name = snapshotName(product, lang, sku);
  const isList = layout === 'list';

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove();
      setRemoved(true);
    } catch {
      // The item stays listed; the customer can try again.
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article
      title={name}
      className={cn(
        'relative bg-slate-50 cursor-default',
        isList
          ? 'flex items-center gap-3 rounded-md border border-gray-200 p-3'
          : 'flex h-full flex-col overflow-hidden rounded-2xl border border-[#EAEEF2]',
        className,
      )}
    >
      <div className={cn(isList && 'flex min-w-0 flex-1 items-center gap-3')}>
        <div
          className={cn(
            'relative shrink-0 overflow-hidden bg-white opacity-50 grayscale',
            isList
              ? 'h-[72px] w-[72px] rounded-md ring-1 ring-gray-100'
              : 'mx-auto w-full aspect-square max-w-[140px] sm:max-w-[180px] md:max-w-[200px]',
          )}
        >
          <Image
            src={product?.image_url || productPlaceholder}
            alt={name}
            fill
            sizes={
              isList
                ? '72px'
                : '(max-width: 640px) 140px, (max-width: 768px) 180px, 200px'
            }
            className="object-contain p-1 sm:p-2"
          />
        </div>
        <div className={cn('min-w-0', !isList && 'px-3 pt-2')}>
          <p className="text-[11px] font-semibold uppercase text-slate-500">
            {sku}
          </p>
          <p
            className={cn(
              'text-sm font-semibold text-slate-600',
              isList ? 'truncate' : 'line-clamp-2',
            )}
          >
            {name}
          </p>
        </div>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2',
          !isList && 'mt-auto justify-between px-3 pb-3 pt-2',
        )}
      >
        <span
          id={statusId}
          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500"
        >
          {t('text-no-longer-available')}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          aria-label={`${removeLabel}: ${name}`}
          aria-describedby={statusId}
          title={removeLabel}
          className="rounded p-1 text-slate-500 transition-colors hover:text-rose-600 disabled:opacity-50"
        >
          {removeIcon}
        </button>
      </div>
    </article>
  );
}

interface UnavailableSavedProductProps {
  item: UnavailableListItem;
  source: SavedListSource;
  lang: string;
  layout?: 'grid' | 'list';
  className?: string;
}

/** The greyed-out card in the favorites or reminders list it was saved to. */
export function UnavailableSavedProduct({
  item,
  source,
  lang,
  layout,
  className,
}: UnavailableSavedProductProps) {
  const { t } = useTranslation(lang, 'common');
  const likes = useLikes();
  const reminders = useReminders();
  const queryClient = useQueryClient();
  const isFavorites = source === 'likes';

  async function removeFromList() {
    await (isFavorites ? likes.unlike(item.sku) : reminders.remove(item.sku));
    // Reload the list in the background: the pages after this one shift, and
    // an emptied list shows its empty state.
    void queryClient.invalidateQueries({ queryKey: ['search-special'] });
  }

  return (
    <UnavailableProductCard
      sku={item.sku}
      product={item.product}
      lang={lang}
      layout={layout}
      className={className}
      removeLabel={
        isFavorites ? t('text-remove-from-wishlist') : t('text-remove-reminder')
      }
      removeIcon={
        isFavorites ? (
          <IoIosHeart className="text-[18px]" />
        ) : (
          <ReminderIconFilled className="text-[18px]" />
        )
      }
      onRemove={removeFromList}
    />
  );
}
