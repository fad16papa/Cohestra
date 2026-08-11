import type { NextConfig } from "next";
import { contentSecurityPolicyDevHeader } from "./content-security-policy";
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
        headers: [...securityHeaders, contentSecurityPolicyDevHeader],
      },
    ];
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
