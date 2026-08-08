import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

  // next.config.js

  allowedDevOrigins: ['192.168.0.100'],

  // nodemailer uses Node built-ins (net/tls/crypto); keep it out of the
  // Server Components / Route Handlers bundle so they resolve at runtime.
  //
  // pdfkit -> fontkit is built by Parcel against `@swc/helpers` whose
  // `applyDecoratedDescriptor` named export is mis-bundled by Turbopack and
  // ends up undefined at runtime, crashing any Server Action that imports
  // the receipt generator (see lib/pdf/moneyReceiptPdf.ts). Marking both as
  // server-external packages forces Next.js to `require()` them straight from
  // node_modules at runtime, bypassing the broken SWC helper path entirely.
  serverExternalPackages: ['nodemailer', 'resend', 'pdfkit', 'fontkit'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;