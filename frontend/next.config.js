/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: 'https://api.himalingo.com/:path*',
    }
  ],

  turbopack: {},
};

module.exports = nextConfig;