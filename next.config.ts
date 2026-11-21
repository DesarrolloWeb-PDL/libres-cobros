import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mercadopago"],
  poweredByHeader: false,
  compress: true,
  // Clean URL for the interactive user manual (public/manual/index.html)
  rewrites: async () => [
    { source: "/manual", destination: "/manual/index.html" },
  ],
  images: {
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
