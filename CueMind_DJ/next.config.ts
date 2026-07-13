import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["essentia.js", "onnxruntime-node"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-images.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "api.deezer.com",
      },
    ],
  },
  experimental: {
    middlewareClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
