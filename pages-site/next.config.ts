import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ishatiye",
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_DEMO_MODE: "true" },
  turbopack: { root: path.resolve(__dirname, "..") },
};

export default nextConfig;
