import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  experimental: {
    // Partial Prerendering (PPR) is currently Canary-only in this version
  // ppr: 'incremental',
  },
  eslint: {
    // Permitir que el build continúe incluso con errores de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
