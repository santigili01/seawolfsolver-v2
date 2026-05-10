import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://seawolfsolver-v2.vercel.app"

  return [
    { url: base, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/sea-wolf-demo`, lastModified: new Date(), priority: 0.85 },
    { url: `${base}/pricing`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/practice`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/practice/sea-wolf`, lastModified: new Date(), priority: 0.55 },
    { url: `${base}/practice/sea-wolf-treatment`, lastModified: new Date(), priority: 0.6 },
    { url: `${base}/practice/solver`, lastModified: new Date(), priority: 0.7 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/refund-policy`, lastModified: new Date(), priority: 0.3 },
  ]
}
