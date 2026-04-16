'use client';
import cn from 'classnames';
import React from 'react';
import type {
  ErpPriceData,
  PackagingOption,
} from '@utils/transform/erp-prices';
import { getPackagingGridData } from '@utils/packaging';

type Props = {
  pd?: ErpPriceData; // full ERP price data
  options?: PackagingOption[]; // OR pass options directly
  uom?: string; // optional unit when using options[]
  className?: string;
  umLabel?: string; // header label, default "UM"
  minColWidthPx?: number; // tweak col width if needed
};

const PackagingGrid: React.FC<Props> = ({
  pd,
  options: optsProp,
  uom,
  className,
  umLabel = 'UM',
}) => {
  // Works with either `pd` or `options` (+ optional `uom`)
  const { options, uom: resolvedUom } = getPackagingGridData(
    pd ?? optsProp,
    uom,
  );
  if (!options.length) return null;

  const cellClass =
    'flex-1 min-w-0 px-2 py-1 text-center border-r border-gray-200 last:border-r-0';

  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-gray-200 bg-white/60 text-[11px] sm:text-xs',
        className,
      )}
      role="table"
      aria-label="Packaging options"
    >
      {/* UM column */}
      <div className={cellClass}>
        <div className="text-gray-500 font-medium" role="columnheader">
          {umLabel}
        </div>
        <div className="font-semibold" role="cell">
          {resolvedUom}
        </div>
      </div>

      {/* One column per packaging option */}
      {options.map((o) => (
        <div key={o.packaging_code} className={cellClass}>
          <div
            className="uppercase text-gray-500 font-medium"
            role="columnheader"
          >
            {o.packaging_code}
          </div>
          <div className="font-semibold" role="cell">
            {o.qty_x_packaging ?? '1'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PackagingGrid;
