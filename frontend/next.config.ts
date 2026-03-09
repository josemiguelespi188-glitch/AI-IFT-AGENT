import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@pinecone-database/pinecone"],
  },
};

export default nextConfig;
