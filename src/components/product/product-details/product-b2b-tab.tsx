// @components/product/product-b2b-details-tab.tsx
'use client';

import * as React from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import type { Product } from '@framework/types';

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

// Normalize `product.features` into [{label, value}]
function normalizeFeatures(raw: any): { label: string; value: string }[] {
  if (!raw) return [];
  const out: { label: string; value: string }[] = [];

  const pushKV = (k: any, v: any) => {
    const label = String(k ?? '').trim();
    const value = v == null ? '' : String(v).trim();
    if (label && value) out.push({ label, value });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item) continue;

      // Common shapes
      if (typeof item === 'object' && !Array.isArray(item)) {
        if ('key' in item || 'label' in item || 'value' in item) {
          pushKV((item as any).key ?? (item as any).label, (item as any).value);
          continue;
        }
        // generic object -> take first own pair
        const [k] = Object.keys(item);
        if (k) pushKV(k, (item as any)[k]);
        continue;
      }

      if (Array.isArray(item) && item.length >= 2) {
        pushKV(item[0], item[1]);
        continue;
      }
    }
  } else if (typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) pushKV(k, v);
  }

  return out;
}

/* ----------------- Documents helpers ----------------- */

type DocItem = { url: string; area?: string; filename?: string; ext?: string };

// map media_area_id -> label (English-friendly)
const DOC_LABEL: Record<string, string> = {
  datasheet: 'Datasheet',
  certification: 'Certification',
  catalog: 'Catalog',
  docs: 'Scheda Tecnica',
  safety: 'Safety',
  barcode: 'Barcode',
  instruction: 'Instructions',
  details: 'Details',
  videos: 'Videos',
};

// normalize misspelling `istruction` -> `instruction`
function normalizeDocType(area?: string) {
  const a = (area || '').toLowerCase();
  if (a === 'istruction') return 'instruction';
  return a;
}

// group docs by normalized type
function groupDocs(docs?: DocItem[]) {
  const out: Record<string, DocItem[]> = {};
  if (!Array.isArray(docs)) return out;

  for (const d of docs) {
    const type = normalizeDocType(d.area);
    if (!type) continue;
    const filename = d.filename || d.url?.split('/').pop() || '';
    const ext = (d.ext || filename.split('.').pop() || '').toLowerCase();
    (out[type] ||= []).push({ ...d, filename, ext });
  }
  return out;
}

/* ----------------- Component ----------------- */

export default function ProductB2BDetailsTab({
  lang, // reserved for future i18n labels
  product,
}: {
  lang: string;
  product: Product;
}) {
  const hasDescription = Boolean(product?.description && product.description.trim().length > 0);
  const features = normalizeFeatures(product?.features);
  const hasFeatures = features.length > 0;

  const docsByType = groupDocs(product.docs as any);
  const hasDocs = Object.keys(docsByType).length > 0;

  if (!hasDescription && !hasFeatures && !hasDocs) return null;

  const tabs: { id: string; label: string; node: React.ReactNode }[] = [];

  if (hasDescription) {
    tabs.push({
      id: 'desc',
      label: 'Descrizione',
      node: (
        <div
          className="prose prose-sm max-w-none leading-[1.9] text-brand-muted"
          dangerouslySetInnerHTML={{ __html: product.description! }}
        />
      ),
    });
  }

  if (hasFeatures) {
    tabs.push({
      id: 'feat',
      label: 'Caratteristiche tecniche',
      node: (
        <div className="rounded border border-border-base">
          <dl className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
            {features.map(({ label, value }, i) => (
              <React.Fragment key={`${label}-${i}`}>
                <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600 sm:text-sm">
                  {label.toUpperCase()}
                </dt>
                <dd className="border-b border-border-base px-4 py-3 text-sm text-brand-dark">
                  {value}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      ),
    });
  }



  if (hasDocs) {
    tabs.push({
      id: 'docs',
      label: 'Documenti',
      node: (
        <div className="rounded border border-border-base">
          <dl className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
            {[
              'datasheet',
              'certification',
              'catalog',
              'docs',
              'safety',
              'barcode',
              'instruction',
              'details',
              'videos',
            ]
              .filter((type) => docsByType[type]?.length)
              .flatMap((type) =>
                docsByType[type]!.map((d, i) => (
                  <React.Fragment key={`${type}-${i}`}>
                    {/* Left column: label */}
                    <dt className="border-b border-border-base bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600 sm:text-sm">
                      {DOC_LABEL[type] ?? type}
                    </dt>
                    {/* Right column: link */}
                    <dd className="border-b border-border-base px-4 py-3 text-sm">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-brand hover:underline break-words"
                        title={d.filename}
                      >
                        {d.filename || d.url}
                      </a>
                      {d.ext && (
                        <span className="ml-2 inline-flex items-center rounded border px-1 text-[11px] uppercase text-gray-600">
                          {d.ext.slice(0, 4)}
                        </span>
                      )}
                    </dd>
                  </React.Fragment>
                ))
              )}
          </dl>
        </div>
      ),
    });
  }


  return (
    <div className="w-full py-8 sm:px-0 lg:py-10 xl:px-2 xl:py-12">
      <TabGroup>
        <TabList className="block border-b border-border-base">
          {tabs.map((t) => (
            <Tab
              key={t.id}
              className={({ selected }) =>
                classNames(
                  'relative inline-block pb-3 text-15px leading-5 text-brand-dark transition-all hover:text-brand ltr:mr-8 rtl:ml-8 lg:pb-5 lg:text-17px',
                  selected &&
                  'font-semibold after:absolute after:bottom-0 after:h-0.5 after:w-full after:translate-y-[1px] after:bg-brand after:ltr:left-0 after:rtl:right-0'
                )
              }
            >
              {t.label}
            </Tab>
          ))}
        </TabList>

        <TabPanels className="mt-6 lg:mt-9">
          {tabs.map((t) => (
            <TabPanel key={t.id}>{t.node}</TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
