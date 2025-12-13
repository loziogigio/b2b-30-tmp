'use client';

import React, { type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import SectionHeader from '@components/common/section-header';
import { useTranslation } from 'src/app/i18n/client';
import type {
  ProductDataTableBlockConfig,
  ProductDataTableRowConfig,
  ProductDataTableValueType,
} from '@/lib/types/blocks';

const GRID_WIDTH_CLASS_MAP: Record<number, string> = {
  120: 'sm:grid-cols-[120px,1fr]',
  130: 'sm:grid-cols-[130px,1fr]',
  140: 'sm:grid-cols-[140px,1fr]',
  150: 'sm:grid-cols-[150px,1fr]',
  160: 'sm:grid-cols-[160px,1fr]',
  170: 'sm:grid-cols-[170px,1fr]',
  180: 'sm:grid-cols-[180px,1fr]',
  190: 'sm:grid-cols-[190px,1fr]',
  200: 'sm:grid-cols-[200px,1fr]',
  210: 'sm:grid-cols-[210px,1fr]',
  220: 'sm:grid-cols-[220px,1fr]',
  230: 'sm:grid-cols-[230px,1fr]',
  240: 'sm:grid-cols-[240px,1fr]',
  250: 'sm:grid-cols-[250px,1fr]',
  260: 'sm:grid-cols-[260px,1fr]',
  270: 'sm:grid-cols-[270px,1fr]',
  280: 'sm:grid-cols-[280px,1fr]',
  290: 'sm:grid-cols-[290px,1fr]',
  300: 'sm:grid-cols-[300px,1fr]',
  310: 'sm:grid-cols-[310px,1fr]',
  320: 'sm:grid-cols-[320px,1fr]',
  330: 'sm:grid-cols-[330px,1fr]',
  340: 'sm:grid-cols-[340px,1fr]',
  350: 'sm:grid-cols-[350px,1fr]',
  360: 'sm:grid-cols-[360px,1fr]',
  370: 'sm:grid-cols-[370px,1fr]',
  380: 'sm:grid-cols-[380px,1fr]',
  390: 'sm:grid-cols-[390px,1fr]',
  400: 'sm:grid-cols-[400px,1fr]',
  410: 'sm:grid-cols-[410px,1fr]',
  420: 'sm:grid-cols-[420px,1fr]',
};

const clampColumnWidth = (width?: number) => {
  if (typeof width !== 'number' || Number.isNaN(width)) {
    return 220;
  }
  return Math.min(Math.max(width, 120), 420);
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const renderLeftContent = (row: ProductDataTableRowConfig, t: TranslateFn) => {
  const type: ProductDataTableValueType =
    row.leftValueType ??
    (row.valueType === 'image' ? 'text' : row.imageUrl ? 'image' : 'text');

  if (type === 'image') {
    if (!row.imageUrl) {
      return (
        <span className="text-xs text-gray-400">{t('text-no-image')}</span>
      );
    }
    const style: CSSProperties | undefined = row.imageAspectRatio
      ? { aspectRatio: row.imageAspectRatio }
      : undefined;
    return (
      <div className="flex flex-col items-center gap-2">
        <img
          src={row.imageUrl}
          alt={row.imageAlt || row.label}
          className="mx-auto h-auto max-h-16 w-auto object-contain"
          style={style}
          loading="lazy"
        />
        {row.label ? (
          <span className="text-[11px] font-medium text-gray-600">
            {row.label}
          </span>
        ) : null}
      </div>
    );
  }

  if (type === 'html' && row.leftHtml) {
    return (
      <div
        className="prose prose-xs max-w-none text-gray-700"
        dangerouslySetInnerHTML={{ __html: row.leftHtml }}
      />
    );
  }

  return (
    <span className="block whitespace-pre-wrap break-words text-gray-800">
      {row.label}
    </span>
  );
};

const wrapLeftContent = (node: ReactNode, row: ProductDataTableRowConfig) => {
  if (!node) return null;
  if (!row.leftLink?.url) {
    return node;
  }

  const openInNewTab = row.leftLink.openInNewTab ?? true;
  const rel =
    row.leftLink.rel ??
    (openInNewTab ? 'noopener noreferrer nofollow' : undefined);

  return (
    <a
      href={row.leftLink.url}
      target={openInNewTab ? '_blank' : undefined}
      rel={rel}
      className="inline-flex max-w-full items-center gap-2 text-brand hover:underline"
    >
      {node}
    </a>
  );
};

const renderRightContent = (row: ProductDataTableRowConfig, t: TranslateFn) => {
  const type: ProductDataTableValueType = row.valueType ?? 'text';

  if (type === 'image') {
    const imageUrl = row.valueImageUrl || row.imageUrl;
    if (!imageUrl) {
      return (
        <span className="text-xs text-gray-400">{t('text-no-image')}</span>
      );
    }
    const style: CSSProperties | undefined = row.valueImageAspectRatio
      ? { aspectRatio: row.valueImageAspectRatio }
      : row.imageAspectRatio
        ? { aspectRatio: row.imageAspectRatio }
        : undefined;

    return (
      <img
        src={imageUrl}
        alt={row.valueImageAlt || row.imageAlt || row.label}
        className="mx-auto h-auto max-h-64 w-full max-w-xl rounded-md border border-border-base object-contain"
        style={style}
        loading="lazy"
      />
    );
  }

  if (type === 'html' && row.html) {
    return (
      <div
        className="prose prose-sm max-w-none text-brand-dark"
        dangerouslySetInnerHTML={{ __html: row.html }}
      />
    );
  }

  return (
    <span className="block whitespace-pre-wrap break-words text-brand-dark">
      {row.value ?? ''}
    </span>
  );
};

const wrapRightContent = (node: ReactNode, row: ProductDataTableRowConfig) => {
  if (!node) return null;
  if (!row.link?.url) {
    return node;
  }

  const openInNewTab = row.link.openInNewTab ?? true;
  const rel =
    row.link.rel ?? (openInNewTab ? 'noopener noreferrer nofollow' : undefined);

  return (
    <a
      href={row.link.url}
      target={openInNewTab ? '_blank' : undefined}
      rel={rel}
      className="inline-flex max-w-full items-center gap-2 text-brand hover:underline"
    >
      {node}
    </a>
  );
};

interface ProductDataTableBlockProps {
  config: ProductDataTableBlockConfig;
  lang?: string;
}

export function ProductDataTableBlock({
  config,
  lang = 'it',
}: ProductDataTableBlockProps) {
  const {
    title,
    description,
    rows = [],
    labelColumnWidth,
    appearance,
  } = config;
  const { t } = useTranslation(lang, 'common');

  if (!rows.length) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
        {t('text-product-data-table-empty', {
          defaultValue:
            'No rows configured. Add rows in the builder to populate this table.',
        })}
      </div>
    );
  }

  const columnWidth = clampColumnWidth(labelColumnWidth);
  const widthKey = Math.round(columnWidth / 10) * 10;
  const responsiveColClass =
    GRID_WIDTH_CLASS_MAP[widthKey] || GRID_WIDTH_CLASS_MAP[220];
  const gridColsClass = `grid grid-cols-1 ${responsiveColClass}`;
  const bordered = appearance?.bordered !== false;
  const rounded = appearance?.rounded !== false;
  const zebra = appearance?.zebraStripes === true;

  const tableSurfaceClasses = [
    rounded ? 'rounded' : '',
    bordered ? 'border border-border-base' : '',
    'overflow-hidden bg-white',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const content = (
    <div className={tableSurfaceClasses}>
      <dl className={gridColsClass}>
        {rows.map((row, index) => {
          const key = row.id || `${row.label}-${index}`;
          const highlightClasses = row.highlight
            ? 'border-brand bg-brand/5'
            : '';
          const zebraClass = zebra && index % 2 === 1 ? 'bg-slate-50/60' : '';

          const leftContent = wrapLeftContent(
            renderLeftContent(row, t),
            row,
          ) ?? (
            <span className="block whitespace-pre-wrap break-words text-gray-800">
              {row.label}
            </span>
          );
          const rightContent = wrapRightContent(
            renderRightContent(row, t),
            row,
          );

          return (
            <React.Fragment key={key}>
              <dt
                className={`border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-gray-600 sm:text-sm ${row.highlight ? 'bg-gray-100' : ''}`}
              >
                <div className="space-y-2">
                  {leftContent}
                  {row.leftHelperText ? (
                    <p className="text-xs text-gray-500">
                      {row.leftHelperText}
                    </p>
                  ) : null}
                </div>
              </dt>
              <dd
                className={[
                  'border-b border-border-base px-4 py-3 text-sm text-brand-dark',
                  zebraClass,
                  highlightClasses,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="space-y-1">
                  {rightContent}
                  {row.helperText ? (
                    <p className="text-xs text-gray-500">{row.helperText}</p>
                  ) : null}
                </div>
              </dd>
            </React.Fragment>
          );
        })}
      </dl>
    </div>
  );

  if (!title && !description) {
    return <div className="mt-6">{content}</div>;
  }

  return (
    <div className="mt-6 space-y-4">
      {title ? (
        <div className="mb-2 md:mb-3">
          <SectionHeader sectionHeading={title} className="mb-0" lang={lang} />
        </div>
      ) : null}
      {description ? (
        <p className="max-w-3xl text-sm text-slate-600">{description}</p>
      ) : null}
      {content}
    </div>
  );
}
