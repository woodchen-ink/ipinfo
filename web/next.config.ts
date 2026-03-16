import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSR mode for EdgeOne Pages deployment
  // No "output: export" — dynamic routes like /1.1.1.1 are rendered server-side
};

export default nextConfig;
