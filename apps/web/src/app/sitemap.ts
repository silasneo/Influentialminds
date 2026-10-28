import type { MetadataRoute } from "next";
import { api, SITE_URL } from "@/lib/api";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/episodes",
    "/guests",
    "/topics",
    "/collections",
    "/about",
    "/ask",
  ].map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const payload = await api.sitemap();
    const entries: MetadataRoute.Sitemap = [
      ...payload.episodes.map(item => ({
        url: `${SITE_URL}/episodes/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        priority: 0.9,
      })),
      ...payload.guests.map(item => ({
        url: `${SITE_URL}/guests/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        priority: 0.6,
      })),
      ...payload.topics.map(item => ({
        url: `${SITE_URL}/topics/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        priority: 0.6,
      })),
      ...payload.collections.map(item => ({
        url: `${SITE_URL}/collections/${item.slug}`,
        lastModified: new Date(item.updatedAt),
        priority: 0.6,
      })),
    ];
    return [...staticRoutes, ...entries];
  } catch {
    return staticRoutes;
  }
}
