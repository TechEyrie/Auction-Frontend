import type { NextConfig } from 'next';

const backendOrigin = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Proxy /api → backend when the browser uses a same-origin API base
 * (`NEXT_PUBLIC_API_BASE_URL=same-origin` plus `BACKEND_URL` on Vercel).
 * Skip rewriting to localhost in production builds — Vercel cannot reach private/loopback hosts
 * (DNS_HOSTNAME_RESOLVED_PRIVATE) and that broke listing images on auction-frontend-rouge.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(backendOrigin);
    if (process.env.NODE_ENV === 'production' && isLoopback) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/same-origin/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
