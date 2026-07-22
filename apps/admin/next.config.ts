import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@violin-erp/api", "@violin-erp/database"],
};

export default nextConfig;
