import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["10.230.61.120"],
  outputFileTracingIncludes: {
    "/images/agency-logos/*": ["./agency_info/images/*.png"],
  },
};

export default nextConfig;
