import type { MetadataRoute } from 'next';
import { getSeoConfig, robotsConfigToRoute } from '@/lib/vcs/seo';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || '').replace(
    /\/$/,
    '',
  );
  const sitemapUrl = siteUrl ? `${siteUrl}/sitemap.xml` : undefined;

  // vcs is authoritative for robots (spec D5). `getSeoConfig` already returns
  // the current static rules as its safe fallback when vcs is unreachable, so
  // an outage degrades to today's behaviour rather than 500ing.
  const config = await getSeoConfig();
  return robotsConfigToRoute(config.robots, sitemapUrl);
}
