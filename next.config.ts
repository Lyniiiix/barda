import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["node:sqlite"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
