'use client';

import cn from 'classnames';
import { useTranslation } from 'src/app/i18n/client';

export interface ProductContentFlags {
  has_video?: boolean;
  has_3d?: boolean;
  has_correlations?: boolean;
}

interface Props {
  lang: string;
  product: ProductContentFlags;
  /** e.g. "vinc-pbadges--overlay" to float the stack over a product image. */
  className?: string;
}

/**
 * One small label per kind of extra content the product carries.
 *
 * The elements deliberately contain NO glyph: each modifier class owns its icon
 * in CSS (see `.vinc-pbadge--*` in globals.css), so a theme or a per-tenant
 * stylesheet can change the icons without touching this file.
 */
const BADGES: Array<{
  flag: keyof ProductContentFlags;
  modifier: string;
  i18nKey: string;
  fallback: string;
}> = [
  {
    flag: 'has_video',
    modifier: 'vinc-pbadge--video',
    i18nKey: 'text-has-video',
    fallback: 'Video disponibile',
  },
  {
    flag: 'has_3d',
    modifier: 'vinc-pbadge--3d',
    i18nKey: 'text-has-3d',
    fallback: 'Modello 3D disponibile',
  },
  {
    flag: 'has_correlations',
    modifier: 'vinc-pbadge--related',
    i18nKey: 'text-has-related',
    fallback: 'Prodotti correlati',
  },
];

export default function ProductBadges({ lang, product, className }: Props) {
  const { t } = useTranslation(lang, 'common');

  const active = BADGES.filter((badge) => product?.[badge.flag] === true);
  if (!active.length) {
    return null;
  }

  // A <span>, not a <div>: the list row renders the stack inside a <button>,
  // which only accepts phrasing content. `.vinc-pbadges` sets display:flex, so
  // the layout is unaffected.
  return (
    <span className={cn('vinc-pbadges', className)}>
      {active.map((badge) => {
        const label = t(badge.i18nKey, { defaultValue: badge.fallback });
        return (
          <span
            key={badge.modifier}
            className={cn('vinc-pbadge', badge.modifier)}
            title={label}
            aria-label={label}
            role="img"
          />
        );
      })}
    </span>
  );
}
