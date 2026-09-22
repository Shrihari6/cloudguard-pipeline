import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Dev-only API rewrite: proxies /api/* → Spring Boot on localhost:8081.
   * This acts as a same-origin proxy so browsers never see a cross-origin
   * request during local development. Has no effect in production (Vercel).
   *
   * In production the NEXT_PUBLIC_API_BASE_URL env var on Vercel points to
   * the Render backend URL, so fetch() calls go directly there with CORS
   * headers handled by WebConfig.java.
   */
  async rewrites() {
    // Only apply rewrites when hitting the local backend during development
    if (process.env.NODE_ENV !== "development") return [];

    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
