import type { NextConfig } from "next";
import { contentSecurityPolicyReportOnlyDevHeader } from "./content-security-policy";
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
        headers: [...securityHeaders, contentSecurityPolicyReportOnlyDevHeader],
      },
    ];
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
