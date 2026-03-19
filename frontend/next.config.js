/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable any default Next.js development features that might show logos
  reactStrictMode: true,
  // Fix for HMR issues in newer Next.js versions
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Add empty turbopack config to silence the warning (Next.js 16+)
  turbopack: {},
};

module.exports = nextConfig;