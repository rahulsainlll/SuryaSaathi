import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/ui ships TypeScript source.
  transpilePackages: ["@suryasaathi/ui"],
};

export default nextConfig;
