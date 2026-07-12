import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // This tells Next.js to ignore minor TypeScript type errors during deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;


// next.config.js
module.exports = {
  allowedDevOrigins: ['150.1.196.31'],
}