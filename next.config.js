/** @type {import('next').NextConfig} */

module.exports = {
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
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
      {
        protocol: 'https',
        hostname: 'hidros.s3.eu-de.cloud-object-storage.appdomain.cloud',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'b2b.hidros.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drupal-hidros.omnicommerce.cloud',
        pathname: '/**',
      },
    ],
    unoptimized: true, // 🔥 disables image optimization
  },
};
