import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Whop sends Founding Seat buyers to /?welcome=1 after checkout; their deals live on /members.
  async redirects() {
    return [{ source: "/", has: [{ type: "query", key: "welcome" }], destination: "/members", permanent: false }];
  },
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
