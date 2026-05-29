'use client';

import { useThemeId } from '@/contexts/tenant.context';
import DefaultBlockRenderer from '@/components/themes/default/home/default-block-renderer';
import TimeBlockRenderer from '@/components/themes/time/home/time-block-renderer';

/**
 * Renders a single page block through the active theme's block renderer
 * (the same renderers the home page uses). Lets CMS pages reuse the full
 * home block catalog — hero, all carousel-* variants, product/category
 * sections, etc. — instead of only the handful CmsPageRenderer handles itself.
 */
export default function ThemedHomeBlock({
  block,
  lang,
}: {
  block: any;
  lang: string;
}) {
  const Renderer =
    useThemeId() === 'time' ? TimeBlockRenderer : DefaultBlockRenderer;
  return <Renderer block={block} lang={lang} />;
}
