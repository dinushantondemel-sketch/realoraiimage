import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: [
      "https://www.realoraiimage.com/sitemap.xml",
      "https://realoraiimage.com/sitemap.xml",
    ],
  };
}
