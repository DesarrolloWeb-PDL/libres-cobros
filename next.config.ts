import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mercadopago"],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
