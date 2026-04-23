import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/faculty",
        destination: "/academic",
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
