import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export" only in production build, dev mode doesn't support it well
  // with optional catch-all routes. See: https://github.com/vercel/next.js/issues/56477
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
};

export default nextConfig;
