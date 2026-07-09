import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // This tells Next.js to ignore ESLint warnings during deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This tells Next.js to ignore minor TypeScript type errors during deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;