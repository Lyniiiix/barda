import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["node:sqlite"],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
};

export default nextConfig;
