/**
 * B2B Page Registry — collection `b2bpages`.
 *
 * Lightweight metadata for pages authored in vinc-commerce-suite's B2B page
 * builder. The actual block content lives in `b2bhometemplates`, keyed by
 * `templateId: "b2b-{portal}-page-{slug}"`. We only consult this registry
 * for sitemap + navigation use cases where we need the list of slugs.
 *
 * Mirrors the schema in vinc-commerce-suite/src/lib/db/models/b2b-page.ts;
 * keep them in sync.
 */

import { Schema } from 'mongoose';

export const B2B_PAGE_STATUSES = ['active', 'inactive'] as const;
export type B2BPageStatus = (typeof B2B_PAGE_STATUSES)[number];

export interface B2BPageDocument {
  _id: string;
  portal_slug: string;
  slug: string;
  title: string;
  status: B2BPageStatus;
  show_in_nav: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export const B2BPageSchema = new Schema(
  {
    portal_slug: { type: String, required: true, trim: true, lowercase: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug must be lowercase alphanumeric with dashes',
      ],
    },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: B2B_PAGE_STATUSES,
      default: 'active',
    },
    show_in_nav: { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'b2bpages',
  },
);

B2BPageSchema.index({ portal_slug: 1, slug: 1 }, { unique: true });
B2BPageSchema.index({ portal_slug: 1, sort_order: 1 });
