import type { NextConfig } from "next";

/**
 * Next.js 16 config for Leave Sprint Twin.
 *
 * - Static export for Netlify (no server needed for v1)
 * - trailingSlash for clean URLs
 * - Images unoptimized (static hosting)
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Turbopack is enabled via `pnpm dev` (next dev --turbopack)
};

export default nextConfig;
