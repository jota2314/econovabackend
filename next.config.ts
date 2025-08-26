import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://amonwicqzmmpzybnzthp.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://amonwicqzmmpzybnzthp.supabase.co wss://amonwicqzmmpzybnzthp.supabase.co",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
