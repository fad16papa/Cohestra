import type { NextConfig } from "next";
import { securityHeaders, shouldNextJsEmitSecurityHeaders } from "./security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    if (!shouldNextJsEmitSecurityHeaders()) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
