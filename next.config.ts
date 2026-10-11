import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Cache Components (PPR) is intentionally OFF.
   *
   * Nearly every route in this app reads the session cookie and per-user
   * database rows, so there is no meaningful static shell to prerender and
   * Cache Components would force each read behind a Suspense boundary for no
   * benefit. If you later convert a genuinely static surface (a marketing
   * page, say) to PPR, enable it for that subtree rather than app-wide.
   */
  cacheComponents: false,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
