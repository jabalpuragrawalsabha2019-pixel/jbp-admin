import type { NextConfig } from 'next'

/**
 * Single Next.js config for the admin panel AND the shared backend API
 * consumed by the Expo app (jbp-agrawal-sabha) via EXPO_PUBLIC_API_URL.
 *
 * NOTE: this file used to coexist with a `next.config.js`. Next.js resolves
 * CONFIG_FILES in order ['next.config.js', 'next.config.mjs', 'next.config.ts'],
 * so `next.config.js` silently won and everything in `next.config.ts`
 * (notably `reactCompiler`) was dead config. Keep exactly ONE config file here.
 */
const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mtudvgoueeldtnrccvyw.supabase.co',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
