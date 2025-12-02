/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['mtudvgoueeldtnrccvyw.supabase.co', 'res.cloudinary.com'],
  },
  // Allow cross-origin requests for development
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

module.exports = nextConfig