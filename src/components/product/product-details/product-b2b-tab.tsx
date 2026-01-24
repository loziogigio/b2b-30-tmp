// @components/product/product-b2b-details-tab.tsx
'use client';

import * as React from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { Product } from '@framework/types';
import type { PageBlock } from '@/lib/types/blocks';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

// Normalize PIM attributes format: { "codice-prodotto": { label, value, order } } -> [{label, value}]
function normalizeAttributes(
  raw: any,
): { label: string; value: string; order?: number }[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: { label: string; value: string; order?: number }[] = [];

  for (const [key, attr] of Object.entries(raw)) {
    if (!attr || typeof attr !== 'object') continue;
    const { label, value, order } = attr as any;
    const labelStr = String(label ?? key ?? '').trim();
    const valueStr = value == null ? '' : String(value).trim();
    if (labelStr && valueStr) {
      out.push({ label: labelStr, value: valueStr, order: order ?? 999 });
    }
  }

  // Sort by order
  return out.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// Normalize `product.features` into [{label, value}] (legacy format)
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

// Normalize marketing_features for current language
// Handles both formats:
// - Direct array: ["Feature 1", "Feature 2"]
// - Language nested: { "it": ["Feature 1", "Feature 2"] }
function normalizeMarketingFeatures(raw: any, lang: string): string[] {
  if (!raw) return [];

  // Handle direct array format
  if (Array.isArray(raw)) {
    return raw.filter((f: any) => typeof f === 'string' && f.trim());
  }

  // Handle language-nested format
  if (typeof raw === 'object') {
    const features = raw[lang] || raw['it'] || Object.values(raw)[0];
    if (!Array.isArray(features)) return [];
    return features.filter((f: any) => typeof f === 'string' && f.trim());
  }

  return [];
}

// Normalize technical_specifications for current language
// Handles both formats:
// - Direct array: [{ key, label, value, uom }, ...]
// - Language nested: { "it": [{ key, label, value, uom }, ...] }
function normalizeTechSpecs(
  raw: any,
  lang: string,
): { label: string; value: string; order?: number }[] {
  if (!raw) return [];

  // Handle direct array format
  let specs: any[];
  if (Array.isArray(raw)) {
    specs = raw;
  } else if (typeof raw === 'object') {
    // Handle language-nested format
    specs = raw[lang] || raw['it'] || Object.values(raw)[0];
    if (!Array.isArray(specs)) return [];
  } else {
    return [];
  }

  return specs
    .map((s: any) => ({
      label: s.label || s.key || '',
      value: s.uom ? `${s.value} ${s.uom}` : String(s.value ?? ''),
      order: s.order ?? 999,
    }))
    .filter((s) => s.label && s.value)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/* ----------------- Documents helpers ----------------- */

type DocItem = {
  url: string;
  area?: string;
  filename?: string;
  ext?: string;
  label?: string;
};

// map media_area_id -> label (Italian-friendly)
const DOC_LABEL: Record<string, string> = {
  datasheet: 'Datasheet',
  certification: 'Certificazione',
  catalog: 'Catalogo',
  docs: 'Scheda Tecnica',
  safety: 'Sicurezza',
  barcode: 'Barcode',
  instruction: 'Istruzioni',
  details: 'Dettagli',
  videos: 'Video',
  document: 'Documento',
};

// normalize misspelling `istruction` -> `instruction`
function normalizeDocType(area?: string) {
  const a = (area || '').toLowerCase();
  if (a === 'istruction') return 'instruction';
  return a;
}

// Extract documents from PIM media array
function extractMediaDocs(media?: any[]): DocItem[] {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m.type === 'document')
    .map((m) => ({
      url: m.url,
      area: 'document',
      filename: m.label || m.url?.split('/').pop() || '',
      ext: m.file_type?.split('/').pop() || m.url?.split('.').pop() || '',
      label: m.label,
    }));
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
  zone3Blocks = [],
}: {
  lang: string;
  product: Product;
  zone3Blocks?: PageBlock[];
}) {
  // Use html_description for the detailed HTML content tab
  // Defensive: handle string, object, or any unexpected type from server
  const rawDesc = (product as any)?.html_description;
  const htmlDesc = typeof rawDesc === 'string' ? rawDesc : '';
  const hasDescription = htmlDesc.trim().length > 0;

  // Use PIM attributes if available, fallback to legacy features
  const pimAttributes = normalizeAttributes((product as any)?.attributes);
  const legacyFeatures = normalizeFeatures(product?.features);
  const features = pimAttributes.length > 0 ? pimAttributes : legacyFeatures;
  const hasFeatures = features.length > 0;

  // Marketing features (bullet points)
  const marketingFeatures = normalizeMarketingFeatures(
    (product as any)?.marketing_features,
    lang,
  );
  const hasMarketingFeatures = marketingFeatures.length > 0;

  // Technical specifications (structured data with labels/values/uom)
  const techSpecs = normalizeTechSpecs(
    (product as any)?.technical_specifications,
    lang,
  );
  const hasTechSpecs = techSpecs.length > 0;

  // Combine legacy docs with PIM media documents
  const legacyDocs = (product.docs as DocItem[] | undefined) || [];
  const mediaDocs = extractMediaDocs((product as any).media);
  const allDocs = [...legacyDocs, ...mediaDocs];
  const docsByType = groupDocs(allDocs);
  const hasDocs = Object.keys(docsByType).length > 0;

  if (
    !hasDescription &&
    !hasMarketingFeatures &&
    !hasFeatures &&
    !hasTechSpecs &&
    !hasDocs
  )
    return null;

  const tabs: { id: string; label: string; node: React.ReactNode }[] = [];

  if (hasDescription) {
    tabs.push({
      id: 'desc',
      label: 'Descrizione',
      node: (
        <div
          className="prose prose-sm max-w-none leading-[1.9] text-brand-muted"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlDesc) }}
        />
      ),
    });
  }

  if (hasMarketingFeatures) {
    tabs.push({
      id: 'marketing',
      label: 'Caratteristiche',
      node: (
        <ul className="list-disc list-inside space-y-2 text-sm text-brand-dark">
          {marketingFeatures.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      ),
    });
  }

  if (hasTechSpecs) {
    tabs.push({
      id: 'tech-specs',
      label: 'Specifiche tecniche',
      node: (
        <div className="rounded border border-border-base">
          <dl className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
            {techSpecs.map(({ label, value }, i) => (
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
      label: 'Schede tecniche e documenti',
      node: (
        <div className="rounded border border-border-base">
          <dl className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
            {[
              'document',
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
                      {d.label || DOC_LABEL[type] || type}
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
                )),
              )}
          </dl>
        </div>
      ),
    });
  }

  // Add zone3 blocks as new tabs
  zone3Blocks.forEach((block, index) => {
    tabs.push({
      id: `zone3-${block.id || index}`,
      label: block.tabLabel || `Tab ${index + 1}`,
      node: (
        <BlockRenderer
          key={block.id || `zone3-${index}`}
          block={block}
          productData={{ sku: String(product?.sku ?? ''), lang }}
        />
      ),
    });
  });

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
                    'font-semibold after:absolute after:bottom-0 after:h-0.5 after:w-full after:translate-y-[1px] after:bg-brand after:ltr:left-0 after:rtl:right-0',
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
