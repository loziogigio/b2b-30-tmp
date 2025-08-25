'use client';
import cn from 'classnames';
import React from 'react';
import type { ErpPriceData } from '@utils/transform/erp-prices';
import { getPackagingGridData } from '@utils/packaging';

type Props = {
  pd?: ErpPriceData;
  className?: string;
  umLabel?: string;          // default "UM", override for i18n
  minColWidthPx?: number;    // tweak col width if needed
};

const PackagingGrid: React.FC<Props> = ({
  pd,
  className,
  umLabel = 'UM',
  minColWidthPx = 44,
}) => {
  const { options, uom, cols } = getPackagingGridData(pd);
  if (!options.length) return null;

  return (
    <div className={cn('rounded-md border border-gray-200 bg-white/60', className)}>
      <div className="overflow-x-auto">
        <div
          className="grid gap-x-2 gap-y-1 px-2 py-1 text-[10px] sm:text-xs min-w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(${minColWidthPx}px,1fr))` }}
          role="table"
          aria-label="Packaging options"
        >
          {/* header row */}
          <div className="text-center text-gray-500 font-medium" role="columnheader">
            {umLabel}
          </div>
          {options.map((o) => (
            <div
              key={`hdr-${o.packaging_code}`}
              className="text-center uppercase text-gray-500 font-medium"
              role="columnheader"
            >
              {o.packaging_code}
            </div>
          ))}

          {/* values row */}
          <div className="text-center font-semibold" role="cell">{uom}</div>
          {options.map((o) => (
            <div
              key={`val-${o.packaging_code}`}
              className="text-center font-semibold"
              role="cell"
            >
              {o.qty_x_packaging ?? '1'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PackagingGrid;
