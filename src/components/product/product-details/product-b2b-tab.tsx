'use client';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import React from 'react';
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

export default function ProductB2BDetailsTab({
  lang,
  product,
}: {
  lang: string;
  product: Product;
}) {
  const hasDescription = Boolean(product?.description && product.description.trim().length > 0);
  const features = normalizeFeatures(product?.features);
  const hasFeatures = features.length > 0;

  if (!hasDescription && !hasFeatures) return null;

  const tabs: { id: string; label: string; node: React.ReactNode }[] = [];
  if (hasDescription) {
    tabs.push({
      id: 'desc',
      label: 'Descrizione',
      node: (
        <div
          className="prose prose-sm max-w-none text-brand-muted leading-[1.9]"
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
        <div className="border rounded border-border-base">
          <dl className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
            {features.map(({ label, value }, i) => (
              <React.Fragment key={`${label}-${i}`}>
                <dt className="bg-gray-50 px-4 py-3 text-[12px] sm:text-sm font-semibold text-gray-600 border-b border-border-base">
                  {label.toUpperCase()}
                </dt>
                <dd className="px-4 py-3 text-sm text-brand-dark border-b border-border-base">
                  {value}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      ),
    });
  }

  return (
    <div className="w-full sm:px-0 xl:px-2 py-8 lg:py-10 xl:py-12">
      <TabGroup>
        <TabList className="block border-b border-border-base">
          {tabs.map((t) => (
            <Tab
              key={t.id}
              className={({ selected }) =>
                classNames(
                  'relative inline-block transition-all text-15px lg:text-17px leading-5 text-brand-dark focus:outline-none pb-3 lg:pb-5 hover:text-brand ltr:mr-8 rtl:ml-8',
                  selected &&
                    'font-semibold after:absolute after:w-full after:h-0.5 after:bottom-0 after:translate-y-[1px] after:ltr:left-0 after:rtl:right-0 after:bg-brand'
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
