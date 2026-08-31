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
        source: "/embed/:path*",
        headers: securityHeaders.filter((header) => header.key !== "X-Frame-Options"),
      },
      {
        source: "/((?!embed/).*)",
        headers: [...securityHeaders, contentSecurityPolicyDevHeader],
      },
    ];
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
