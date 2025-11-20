import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Permitir que el build continúe incluso con errores de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
