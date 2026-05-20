import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false as const,
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
