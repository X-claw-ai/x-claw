import type { MetadataRoute } from "next";

// /robots.txt, tells crawlers what they can and can't fetch.
// Public pages OK to index; API and internal routes blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: "https://kokiai.app/sitemap.xml",
    host: "https://kokiai.app",
  };
}
