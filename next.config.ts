import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isVercel ? {} : { distDir: '.next_dist' }),
};

export default nextConfig;
