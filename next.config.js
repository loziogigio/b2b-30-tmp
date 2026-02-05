/** @type {import('next').NextConfig} */

module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['vinc-mongo-db'],
  // Skip static page generation during build for faster Docker builds
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  skipTrailingSlashRedirect: true,
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value:
              'clipboard-read=(self "http://localhost:3001" "https://cs.vendereincloud.it"), clipboard-write=(self "http://localhost:3001" "https://cs.vendereincloud.it")',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' http://localhost:3001 https://cs.vendereincloud.it",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/it',
        permanent: true,
      },
      {
        source: '/:lang/shop',
        destination: '/:lang/search',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Allow any HTTPS domain for multi-tenant support
      {
        protocol: 'https',
        hostname: '**',
      },
      // HTTP only for localhost (local development)
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
};
