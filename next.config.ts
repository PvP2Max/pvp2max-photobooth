import type { NextConfig } from "next";

// Force-disable lightningcss so builds don't require native binaries
if (!process.env.NEXT_DISABLE_LIGHTNINGCSS) process.env.NEXT_DISABLE_LIGHTNINGCSS = "1";
if (!process.env.TAILWIND_DISABLE_LIGHTNINGCSS) process.env.TAILWIND_DISABLE_LIGHTNINGCSS = "1";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    optimizeCss: false, // disable lightningcss native binary in slim images
  },
};

export default nextConfig;
