export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://getpathfinder.app";

export const PRIVATE_PAGE_ROBOTS = {
  index: false,
  follow: false,
  noarchive: true,
  nosnippet: true,
} as const;
