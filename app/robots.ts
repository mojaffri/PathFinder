import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/discover", "/how-it-works", "/faq", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/auth/",
        "/accelerate",
        "/analytics",
        "/applications",
        "/dashboard",
        "/forgot-password",
        "/jobs",
        "/login",
        "/onboarding",
        "/profile",
        "/projects",
        "/reset-password",
        "/roadmap",
        "/saved",
        "/signup",
        "/skillforge",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
