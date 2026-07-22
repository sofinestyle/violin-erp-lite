import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@violin-erp/api", "@violin-erp/database", "@violin-erp/shared"],
};

export default nextConfig;
