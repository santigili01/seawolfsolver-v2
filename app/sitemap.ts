import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://seawolfsolver-v2.vercel.app"

  return [
    { url: base, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/pricing`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/solver`, lastModified: new Date(), priority: 0.7 },
    { url: `${base}/simulator`, lastModified: new Date(), priority: 0.5 },
    { url: `${base}/simulator/profiling`, lastModified: new Date(), priority: 0.4 },
    { url: `${base}/simulator/categorization`, lastModified: new Date(), priority: 0.4 },
    { url: `${base}/simulator/phase2`, lastModified: new Date(), priority: 0.4 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/refund-policy`, lastModified: new Date(), priority: 0.3 },
  ]
}
