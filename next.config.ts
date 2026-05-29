import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb", // Ajusta este valor según el tamaño de los archivos que subas
    },
  },
};

export default nextConfig;