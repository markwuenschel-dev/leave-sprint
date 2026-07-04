import type { NextConfig } from "next";

/**
 * Next.js 16 config for Leave Sprint Twin.
 *
 * Runs as a Node server on Railway (SSR + /api routes backed by Postgres).
 * (Was previously a static export for Netlify — removed so the API can run.)
 */
const nextConfig: NextConfig = {
  images: { unoptimized: true }, // no image optimizer needed
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
