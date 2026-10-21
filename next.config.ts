import type { NextConfig } from 'next';

const backendOrigin = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Proxy /api → backend for same-origin image/API URLs (local `next dev`/`next start`).
 * On the VPS, nginx already sends /api to :4000, so these rewrites are unused in the browser.
 * Skip only on Vercel: a production rewrite to loopback fails DNS there.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(backendOrigin);
    if (process.env.VERCEL && isLoopback) {
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
