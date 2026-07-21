import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // nodemailer uses Node built-ins (net/tls/crypto); keep it out of the
  // Server Components / Route Handlers bundle so they resolve at runtime.
  serverExternalPackages: ['nodemailer', 'resend'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;