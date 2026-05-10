import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones on the LAN scan the QR and load the dev server via 192.168.x.x —
  // Next 16 blocks dev-only assets from cross-origin hosts unless we allow them.
  // Wildcards are per-segment, so private-IP ranges need fully-expanded patterns.
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  ],
  async headers() {
    if (process.env.NODE_ENV !== "development") return [];
    // iOS Safari aggressively caches dev bundles even with Next's defaults.
    // Force revalidate so phones don't get stuck on stale chunks.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
