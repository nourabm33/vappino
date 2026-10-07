import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** STATIC_EXPORT=1 builds a frontend-only export (no API routes). */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  trailingSlash: isStaticExport,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
