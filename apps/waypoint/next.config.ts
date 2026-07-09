import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@waypoint/rubric", "@waypoint/qbank", "@waypoint/practice-types"],
  // monorepo: silence wrong-lockfile root warning
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
