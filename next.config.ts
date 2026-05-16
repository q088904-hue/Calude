import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next.js stops inferring it from a stray
  // lockfile in the parent directory.
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
