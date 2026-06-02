import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false as const,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async rewrites() {
    return [
      {
        // Fallback for generated images so they route through the API proxy
        // This solves the issue where Next.js doesn't dynamically serve newly created 
        // files in the public folder on some deployed environments.
        source: '/uploads/images/:path*',
        destination: '/api/uploads/images/:path*',
      },
    ];
  },
};

export default nextConfig;
