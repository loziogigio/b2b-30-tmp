"use client";

import { HiOutlineInformationCircle, HiOutlinePencilAlt, HiOutlineTrash } from "react-icons/hi";
import cn from "classnames";
import PriceAndPromo from './price-and-promo';
import type { ErpPriceData } from '@utils/transform/erp-prices';

export interface ComparisonFeature {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ComparisonProduct {
  id: string;
  sku: string;
  title: string;
  model: string;
  status?: "available" | "coming-soon" | "discontinued";
  availabilityText?: string;
  imageUrl?: string;
  description?: string;
  priceData?: ErpPriceData; // Use actual ERP price data
  features: ComparisonFeature[];
  tags?: string[];
}

interface ProductComparisonTableProps {
  products: ComparisonProduct[];
  onRemove?: (sku: string) => void;
}

const statusStyles: Record<NonNullable<ComparisonProduct["status"]>, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  "coming-soon": { label: "Coming soon", className: "bg-amber-50 text-amber-700 border-amber-100" },
  discontinued: { label: "Discontinued", className: "bg-rose-50 text-rose-700 border-rose-100" }
};

export function ProductComparisonTable({ products, onRemove }: ProductComparisonTableProps) {
  const hasAnyTags = products.some((product) => product.tags && product.tags.length > 0);
  const featureLabels = Array.from(
    new Set(
      products.flatMap((product) =>
        product.features.map((feature) => feature.label)
      )
    )
  );

  return (
    <div
      id="comparison-table"
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.04)]"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent"></div>
      <div className="overflow-x-auto">
        <table className="min-w-[960px] border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white/95 px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Specification
              </th>
              {products.map((product) => (
                <th key={product.id} className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {product.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            <tr className="border-t border-slate-100">
              <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">Product</th>
              {products.map((product) => {
                const status = product.status ? statusStyles[product.status] : null;
                return (
                  <td key={`${product.id}-product`} className="px-4 py-5 align-top">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            No image
                          </div>
                        )}
                      </div>
                      <p className="text-base font-semibold text-slate-900">{product.title}</p>
                      {status ? (
                        <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", status.className)}>
                          {product.availabilityText || status.label}
                        </span>
                      ) : product.availabilityText ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {product.availabilityText}
                        </span>
                      ) : null}
                      {hasAnyTags && product.tags?.length ? (
                        <div className="flex flex-wrap justify-center gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {product.description ? (
                        <p className="text-xs text-slate-500 line-clamp-3">{product.description}</p>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr className="border-t border-slate-100">
              <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">Model</th>
              {products.map((product) => (
                <td key={`${product.id}-model`} className="px-4 py-5 text-center">
                  <span className="text-base font-semibold text-slate-900">{product.model}</span>
                </td>
              ))}
            </tr>

            <tr className="border-t border-slate-100">
              <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">Price</th>
              {products.map((product) => (
                <td key={`${product.id}-price`} className="px-4 py-5 text-center">
                  {product.priceData ? (
                    <PriceAndPromo
                      name={product.title}
                      sku={product.sku}
                      priceData={product.priceData}
                      withSchemaOrg={false}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <span className="flex items-center justify-center gap-2">
                        <HiOutlineInformationCircle className="h-4 w-4 text-slate-400" />
                        Price not available
                      </span>
                    </div>
                  )}
                </td>
              ))}
            </tr>

            {featureLabels.map((label) => (
              <tr key={label} className="border-t border-slate-100">
                <th className="sticky left-0 bg-white px-4 py-4 text-sm font-semibold text-slate-600">{label}</th>
                {products.map((product) => {
                  const match = product.features.find((feature) => feature.label === label);
                  return (
                    <td key={`${product.id}-${label}`} className="px-4 py-4 text-center">
                      {match ? (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full border px-3 py-1 text-sm font-semibold text-slate-800",
                            match.highlight
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          )}
                        >
                          {match.value}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}


            {onRemove ? (
              <tr className="border-t border-slate-100">
                <th className="sticky left-0 bg-white px-4 py-5 text-sm font-semibold text-slate-600">Remove</th>
                {products.map((product) => (
                  <td key={`${product.id}-remove`} className="px-4 py-5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(product.sku)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                      Remove
                    </button>
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
