import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    optimizeCss: false, // disable lightningcss native binary in slim images
  },
};

export default nextConfig;
