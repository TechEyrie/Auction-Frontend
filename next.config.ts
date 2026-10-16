import type { NextConfig } from 'next';

const backendOrigin = process.env.BACKEND_URL ?? 'http://localhost:4000';

/** Proxy /api to the Express backend when the client uses a same-origin API base (empty NEXT_PUBLIC_API_BASE_URL). */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
